//! Turn resolution. The engine borrows the content and the state separately, so content can
//! be read while the state is mutated.
//!
//! Ordering and random-number consumption follow Pokémon Showdown's Generation 9 simulator, so
//! that both can be driven from the same seed and compared roll for roll.

mod modifiers;
mod moves;
mod residual;

use std::cmp::Ordering;

use super::events::{DamageCause, Event, HealCause, TraitRef};
use super::request::Choice;
use super::state::{
    ActiveWeather, BattleState, Outcome, Pokemon, SideId, StatusCondition, Volatiles,
};
use crate::dex::{Dex, TraitData, TraitEffect, WeatherData, WeatherId};
use crate::stats::{BoostStat, Boosts, saturate_u16};

#[derive(Clone, Copy, Debug)]
enum Action {
    Switch(usize),
    /// A move slot, or `None` for Struggle.
    Move(Option<usize>),
}

fn action_for(choice: Choice) -> Option<Action> {
    match choice {
        Choice::Switch(slot) => Some(Action::Switch(slot)),
        Choice::Move(slot) => Some(Action::Move(Some(slot))),
        Choice::Struggle => Some(Action::Move(None)),
        Choice::Pass => None,
    }
}

pub(crate) struct Engine<'a> {
    dex: &'a Dex,
    state: &'a mut BattleState,
    events: &'a mut Vec<Event>,
    faint_queue: Vec<SideId>,
}

impl<'a> Engine<'a> {
    pub fn new(dex: &'a Dex, state: &'a mut BattleState, events: &'a mut Vec<Event>) -> Self {
        Self {
            dex,
            state,
            events,
            faint_queue: Vec::new(),
        }
    }

    fn emit(&mut self, event: Event) {
        self.events.push(event);
    }

    fn active(&self, side: SideId) -> &Pokemon {
        self.state.sides[side.index()].active()
    }

    fn active_mut(&mut self, side: SideId) -> &mut Pokemon {
        self.state.sides[side.index()].active_mut()
    }

    fn weather_id(&self) -> Option<WeatherId> {
        self.state.field.weather.map(|weather| weather.id)
    }

    fn weather(&self) -> Option<&'a WeatherData> {
        let dex = self.dex;
        self.weather_id().map(|id| dex.weather(id))
    }

    /// The holder's ability and item with their references, ability first.
    fn traits(&self, side: SideId) -> impl Iterator<Item = (TraitRef, &'a TraitData)> + use<'a> {
        let dex = self.dex;
        let pokemon = self.active(side);
        let ability = pokemon
            .ability
            .map(|id| (TraitRef::Ability(id), dex.ability(id)));
        let item = pokemon.item.map(|id| (TraitRef::Item(id), dex.item(id)));
        ability.into_iter().chain(item)
    }

    /// Every trait effect on the holder with the trait it came from.
    fn trait_effects(
        &self,
        side: SideId,
    ) -> impl Iterator<Item = (TraitRef, &'a TraitEffect)> + use<'a> {
        self.traits(side)
            .flat_map(|(source, data)| data.effects.iter().map(move |effect| (source, effect)))
    }

    pub fn start(&mut self) {
        for side in SideId::BOTH {
            self.active_mut(side).volatiles.entered_this_turn = true;
            self.emit_switched_in(side);
        }
        self.run_entry_effects(SideId::BOTH);
        self.update();
        self.state.turn = 0;
        self.begin_next_turn();
    }

    /// Runs validated choices: replacements between turns, or a full turn.
    pub fn run(&mut self, choices: [Choice; 2]) {
        if !self.state.awaiting_replacements() {
            self.run_turn(choices);
            return;
        }
        let mut switched = Vec::with_capacity(2);
        for side in SideId::BOTH {
            if let Choice::Switch(slot) = choices[side.index()] {
                self.switch_in(side, slot);
                switched.push(side);
            }
        }
        self.run_entry_effects(switched);
        if self.resolve_faints() {
            return;
        }
        self.update();
        self.begin_next_turn();
    }

    fn run_turn(&mut self, choices: [Choice; 2]) {
        let mut pending = choices.map(action_for);
        // The next actor is picked from the remaining actions each time, re-reading speed after
        // every action as Generation 8 onward does.
        while let Some(side) = self.next_actor(&pending) {
            let Some(action) = pending[side.index()].take() else {
                break;
            };
            match action {
                Action::Switch(slot) => {
                    self.switch_in(side, slot);
                    self.run_entry_effects([side]);
                }
                Action::Move(slot) => {
                    if !self.active(side).is_fainted() {
                        self.use_move(side, slot);
                    }
                }
            }
            if self.resolve_faints() {
                return;
            }
            self.update();
        }
        self.end_of_turn();
    }

    fn move_priority(&self, side: SideId, action: Action) -> i8 {
        match action {
            Action::Move(Some(slot)) => self.active(side).moves[slot]
                .map_or(0, |move_slot| self.dex.move_data(move_slot.id).priority),
            Action::Move(None) => self.dex.move_data(self.dex.struggle()).priority,
            Action::Switch(_) => 0,
        }
    }

    fn next_actor(&mut self, pending: &[Option<Action>; 2]) -> Option<SideId> {
        match (pending[0], pending[1]) {
            (None, None) => None,
            (Some(_), None) => Some(SideId::P1),
            (None, Some(_)) => Some(SideId::P2),
            (Some(first), Some(second)) => {
                let key = |engine: &Self, side, action| {
                    let is_switch = matches!(action, Action::Switch(_));
                    (
                        is_switch,
                        engine.move_priority(side, action),
                        engine.action_speed(side),
                    )
                };
                match key(self, SideId::P1, first).cmp(&key(self, SideId::P2, second)) {
                    Ordering::Greater => Some(SideId::P1),
                    Ordering::Less => Some(SideId::P2),
                    Ordering::Equal => Some(self.random_side()),
                }
            }
        }
    }

    /// Resolves a speed tie the way Showdown's two-element shuffle does.
    fn random_side(&mut self) -> SideId {
        if self.state.prng.below(2) == 0 {
            SideId::P1
        } else {
            SideId::P2
        }
    }

    /// Both sides ordered fastest first, with speed ties broken at random.
    fn speed_order(&mut self) -> [SideId; 2] {
        let first = match self
            .action_speed(SideId::P1)
            .cmp(&self.action_speed(SideId::P2))
        {
            Ordering::Greater => SideId::P1,
            Ordering::Less => SideId::P2,
            Ordering::Equal => self.random_side(),
        };
        [first, first.opponent()]
    }

    /// Orders a subset of sides fastest first.
    fn order_by_speed(&mut self, sides: impl IntoIterator<Item = SideId>) -> Vec<SideId> {
        let sides: Vec<SideId> = sides.into_iter().collect();
        if sides.len() < 2 {
            return sides;
        }
        self.speed_order()
            .into_iter()
            .filter(|side| sides.contains(side))
            .collect()
    }

    fn emit_switched_in(&mut self, side: SideId) {
        let team = &self.state.sides[side.index()];
        let pokemon = team.active();
        let event = Event::SwitchedIn {
            side,
            slot: team.active,
            species: pokemon.species,
            hp: pokemon.hp,
            max_hp: pokemon.max_hp(),
        };
        self.emit(event);
    }

    fn switch_in(&mut self, side: SideId, slot: usize) {
        let outgoing = self.active_mut(side);
        outgoing.boosts = Boosts::default();
        outgoing.volatiles = Volatiles::default();
        if let Some(StatusCondition::Toxic { stage }) = &mut outgoing.status {
            *stage = 0;
        }
        let team = &mut self.state.sides[side.index()];
        team.active = slot;
        team.pokemon_mut(slot).volatiles.entered_this_turn = true;
        self.emit_switched_in(side);
    }

    /// Runs entry abilities and items for creatures that just entered, fastest first.
    fn run_entry_effects(&mut self, sides: impl IntoIterator<Item = SideId>) {
        for side in self.order_by_speed(sides) {
            if self.active(side).is_fainted() {
                continue;
            }
            for (source, effect) in self.trait_effects(side) {
                match *effect {
                    TraitEffect::EntryWeather(weather) => {
                        if self.weather_id() != Some(weather) {
                            self.emit(Event::TraitActivated { side, source });
                            self.set_weather(weather);
                        }
                    }
                    TraitEffect::EntryOpponentBoost(stat, stages) => {
                        let opponent = side.opponent();
                        if !self.active(opponent).is_fainted() {
                            self.emit(Event::TraitActivated { side, source });
                            self.boost(opponent, stat, stages);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// Showdown's "Update" checkpoint: held items that react to HP or status get a chance to
    /// trigger, fastest creature first.
    fn update(&mut self) {
        let reacts = |effect: &TraitEffect| {
            matches!(
                effect,
                TraitEffect::HealAtThreshold { .. } | TraitEffect::CureStatus
            )
        };
        if !SideId::BOTH
            .into_iter()
            .any(|side| self.trait_effects(side).any(|(_, effect)| reacts(effect)))
        {
            return;
        }
        for side in self.speed_order() {
            if self.active(side).is_fainted() {
                continue;
            }
            for (source, effect) in self.trait_effects(side) {
                match *effect {
                    TraitEffect::HealAtThreshold { threshold, amount } => {
                        let pokemon = self.active(side);
                        let hp = u32::from(pokemon.hp) * u32::from(threshold.denominator);
                        let limit = u32::from(pokemon.max_hp()) * u32::from(threshold.numerator);
                        if hp <= limit {
                            let restore = amount.of_floored(u32::from(pokemon.max_hp()));
                            self.emit(Event::TraitActivated { side, source });
                            self.consume_if_item(side, source);
                            self.heal(side, restore, HealCause::Trait(source));
                        }
                    }
                    TraitEffect::CureStatus => {
                        let pokemon = self.active(side);
                        if pokemon.status.is_some() || pokemon.volatiles.confusion_turns > 0 {
                            self.trigger_cure(side, source);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    fn trigger_cure(&mut self, side: SideId, source: TraitRef) {
        self.emit(Event::TraitActivated { side, source });
        self.consume_if_item(side, source);
        self.cure_status(side);
        if self.active(side).volatiles.confusion_turns > 0 {
            self.active_mut(side).volatiles.confusion_turns = 0;
            self.emit(Event::ConfusionEnded { side });
        }
    }

    /// Uses up a consumable item once one of its one-shot effects has triggered.
    fn consume_if_item(&mut self, side: SideId, source: TraitRef) {
        if let TraitRef::Item(item) = source
            && self.dex.item(item).consumable
        {
            self.active_mut(side).item = None;
            self.emit(Event::ItemConsumed { side, item });
        }
    }

    fn set_weather(&mut self, id: WeatherId) -> bool {
        if self.weather_id() == Some(id) {
            return false;
        }
        self.state.field.weather = Some(ActiveWeather {
            id,
            turns_left: self.dex.weather(id).duration,
        });
        self.emit(Event::WeatherStarted { weather: id });
        true
    }

    /// Changes a stat stage and returns whether anything changed.
    fn boost(&mut self, side: SideId, stat: BoostStat, stages: i8) -> bool {
        if self.active(side).is_fainted() {
            return false;
        }
        let applied = self.active_mut(side).boosts.apply(stat, stages);
        if applied != 0 {
            self.emit(Event::StatChanged {
                side,
                stat,
                stages: applied,
            });
        }
        applied != 0
    }

    fn cure_status(&mut self, side: SideId) {
        if let Some(status) = self.active_mut(side).status.take() {
            self.emit(Event::StatusCured {
                side,
                status: status.kind(),
            });
        }
    }

    /// Removes up to `amount` HP and returns how much was actually lost.
    ///
    /// Damage from a move or a confusion self-hit that would knock out a creature at full HP
    /// is first offered to `endure_from_full` traits, ability before item.
    fn damage(&mut self, side: SideId, amount: u32, cause: DamageCause) -> u32 {
        let pokemon = self.active(side);
        if pokemon.is_fainted() || amount == 0 {
            return 0;
        }
        let mut amount = amount;
        let from_move = matches!(cause, DamageCause::Move | DamageCause::Confusion);
        if from_move && pokemon.hp == pokemon.max_hp() && amount >= u32::from(pokemon.hp) {
            let endure = self
                .trait_effects(side)
                .find(|(_, effect)| **effect == TraitEffect::EndureFromFull)
                .map(|(source, _)| source);
            if let Some(source) = endure {
                self.emit(Event::TraitActivated { side, source });
                self.consume_if_item(side, source);
                amount = u32::from(self.active(side).hp - 1);
                if amount == 0 {
                    return 0;
                }
            }
        }
        let pokemon = self.active_mut(side);
        let dealt = saturate_u16(amount).min(pokemon.hp);
        pokemon.hp -= dealt;
        let hp = pokemon.hp;
        self.emit(Event::Damaged {
            side,
            amount: dealt,
            hp,
            cause,
        });
        if hp == 0 {
            self.faint_queue.push(side);
        }
        u32::from(dealt)
    }

    /// Restores up to `amount` HP and returns how much was actually restored.
    fn heal(&mut self, side: SideId, amount: u32, cause: HealCause) -> u32 {
        let pokemon = self.active_mut(side);
        if pokemon.is_fainted() {
            return 0;
        }
        let restored = saturate_u16(amount).min(pokemon.max_hp() - pokemon.hp);
        if restored == 0 {
            return 0;
        }
        pokemon.hp += restored;
        let hp = pokemon.hp;
        self.emit(Event::Healed {
            side,
            amount: restored,
            hp,
            cause,
        });
        u32::from(restored)
    }

    /// Announces queued faints and ends the battle if a side is out of creatures.
    ///
    /// When both sides run out at once, the side whose creature fainted last wins, as in
    /// Generation 5 onward (for example, an attacker knocked out by its own recoil).
    fn resolve_faints(&mut self) -> bool {
        let mut last_fainted = None;
        for side in std::mem::take(&mut self.faint_queue) {
            self.emit(Event::Fainted { side });
            last_fainted = Some(side);
        }
        let defeated = SideId::BOTH.map(|side| self.state.side(side).is_defeated());
        let outcome = match defeated {
            [true, true] => Some(last_fainted.map_or(Outcome::Tie, Outcome::Winner)),
            [true, false] => Some(Outcome::Winner(SideId::P2)),
            [false, true] => Some(Outcome::Winner(SideId::P1)),
            [false, false] => None,
        };
        if let Some(outcome) = outcome {
            self.state.outcome = Some(outcome);
            self.emit(Event::BattleEnded { outcome });
            return true;
        }
        false
    }

    /// Starts the next turn unless the battle is over or a side must first replace a fainted
    /// creature. Like Showdown, the turn counter only advances once the turn actually starts.
    fn begin_next_turn(&mut self) {
        if self.state.outcome.is_some() || self.state.awaiting_replacements() {
            return;
        }
        self.state.turn += 1;
        for side in &mut self.state.sides {
            for pokemon in &mut side.team {
                pokemon.volatiles.entered_this_turn = false;
            }
        }
        let turn = self.state.turn;
        self.emit(Event::TurnStarted { turn });
    }
}
