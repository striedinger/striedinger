//! Turn resolution. The engine borrows the content and the state separately, so content can
//! be read while the state is mutated.
//!
//! Ordering and random-number consumption follow Pokémon Showdown's Generation 9 simulator, so
//! both can be driven from the same seed and compared roll for roll. Handler lookups are gated
//! by each creature's [`HandlerMask`], so creatures without a relevant ability or item cost
//! nothing extra.

mod modifiers;
mod moves;
mod residual;

use std::cmp::Ordering;

use super::events::{DamageSource, Effect, Event, HealSource};
use super::request::Choice;
use super::state::{BattleState, Outcome, Pokemon, QueuedAction, SideId, Volatiles, WeatherState};
use crate::dex::{Dex, Handler, HandlerMask, Status, WeatherData, WeatherId};
use crate::stats::{BoostStat, Boosts, saturate_u16};

/// Creatures whose HP reached zero, in order, until the next faint check. At most both
/// actives can be queued between checks.
#[derive(Clone, Copy, Debug, Default)]
struct FaintQueue {
    sides: [Option<SideId>; 2],
}

impl FaintQueue {
    fn push(&mut self, side: SideId) {
        if let Some(free) = self.sides.iter_mut().find(|entry| entry.is_none()) {
            *free = Some(side);
        }
    }

    fn take(&mut self) -> impl Iterator<Item = SideId> + use<> {
        std::mem::take(&mut self.sides).into_iter().flatten()
    }
}

pub(crate) struct Engine<'a> {
    dex: &'a Dex,
    state: &'a mut BattleState,
    events: &'a mut Vec<Event>,
    faint_queue: FaintQueue,
    /// The move slot being used, for effects that remember it, like a rampage.
    using_slot: Option<usize>,
}

impl<'a> Engine<'a> {
    pub fn new(dex: &'a Dex, state: &'a mut BattleState, events: &'a mut Vec<Event>) -> Self {
        Self {
            dex,
            state,
            events,
            faint_queue: FaintQueue::default(),
            using_slot: None,
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

    /// The kinds of handler the active creature's ability and item have.
    fn mask(&self, side: SideId) -> HandlerMask {
        self.active(side).handler_mask(self.dex)
    }

    /// The active creature's handlers with the ability or item each comes from, ability first.
    fn handlers(&self, side: SideId) -> impl Iterator<Item = (Effect, &'a Handler)> + use<'a> {
        let dex = self.dex;
        let pokemon = self.active(side);
        let ability = pokemon
            .ability
            .map(|id| (Effect::Ability(id), dex.ability(id).handlers.as_slice()));
        let item = pokemon
            .item
            .map(|id| (Effect::Item(id), dex.item(id).handlers.as_slice()));
        ability
            .into_iter()
            .chain(item)
            .flat_map(|(effect, handlers)| handlers.iter().map(move |handler| (effect, handler)))
    }

    /// Announces an ability or item taking effect (`-ability` or `-item`).
    fn announce(&mut self, side: SideId, effect: Effect) {
        self.emit(match effect {
            Effect::Ability(ability) => Event::Ability { side, ability },
            Effect::Item(item) => Event::Item { side, item },
        });
    }

    pub fn start(&mut self) {
        for side in SideId::BOTH {
            self.emit_switch(side);
        }
        self.run_switch_in(SideId::BOTH);
        self.update();
        self.state.turn = 0;
        self.next_turn();
    }

    /// Runs validated choices: replacements between turns, or a full turn.
    pub fn run(&mut self, choices: [Choice; 2]) {
        if !self.state.awaiting_switch() {
            self.terastallize(choices);
            let queue = [
                self.action_for(SideId::P1, choices[0]),
                self.action_for(SideId::P2, choices[1]),
            ];
            self.continue_turn(queue);
            return;
        }
        let mut switched = [None; 2];
        for side in SideId::BOTH {
            if let Choice::Switch(slot) = choices[side.index()] {
                self.switch_in(side, slot);
                switched[side.index()] = Some(side);
            }
        }
        self.run_switch_in(switched.into_iter().flatten());
        if self.faint_messages() {
            return;
        }
        self.update();
        // A mid-turn switch (after a move like U-turn) resumes the paused turn.
        match self.state.queue.take() {
            Some(queue) => self.continue_turn(queue),
            None => self.next_turn(),
        }
    }

    fn action_for(&self, side: SideId, choice: Choice) -> Option<QueuedAction> {
        match choice {
            Choice::Switch(slot) => Some(QueuedAction::Switch(slot)),
            // A validated move choice that is not selectable can only be Struggle's slot 0.
            Choice::Move(slot) | Choice::Terastallize(slot)
                if self.active(side).can_select_move(self.dex, slot) =>
            {
                Some(QueuedAction::Move(Some(slot)))
            }
            Choice::Move(_) | Choice::Terastallize(_) => Some(QueuedAction::Move(None)),
            Choice::Pass => None,
        }
    }

    /// Showdown's `terastallize` actions (queue order 106): before any move, fastest first.
    fn terastallize(&mut self, choices: [Choice; 2]) {
        let wants = choices.map(|choice| matches!(choice, Choice::Terastallize(_)));
        let order = match wants {
            [false, false] => return,
            [true, true] => self.speed_order(),
            _ => SideId::BOTH,
        };
        for side in order {
            if !wants[side.index()] {
                continue;
            }
            self.state.sides[side.index()].can_terastallize = false;
            let pokemon = self.active_mut(side);
            pokemon.terastallized = true;
            let tera_type = pokemon.tera_type;
            self.emit(Event::Terastallize { side, tera_type });
        }
    }

    /// Runs queued actions until the turn ends, the battle ends, or a side must switch
    /// mid-turn, in which case the rest of the queue waits in the state.
    fn continue_turn(&mut self, mut queue: [Option<QueuedAction>; 2]) {
        // The next actor is picked from the remaining actions each time, re-reading speed after
        // every action as Generation 8 onward does.
        while let Some(side) = self.next_actor(&queue) {
            let Some(action) = queue[side.index()].take() else {
                break;
            };
            match action {
                QueuedAction::Switch(slot) => {
                    self.switch_in(side, slot);
                    self.run_switch_in([side]);
                }
                QueuedAction::Move(slot) => {
                    if !self.active(side).is_fainted() {
                        let foe_will_act = queue[side.foe().index()].is_some();
                        if let Some(target) = self.run_move(side, slot, foe_will_act) {
                            self.drag_in(target, &mut queue);
                        }
                    }
                }
            }
            if self.faint_messages() {
                return;
            }
            self.update();
            if self.state.sides.iter().any(|team| team.switch_flag) {
                self.state.queue = Some(queue);
                return;
            }
        }
        self.residual();
    }

    fn priority(&self, side: SideId, action: QueuedAction) -> i8 {
        let move_id = match action {
            QueuedAction::Move(Some(slot)) => match self.active(side).move_slots[slot] {
                Some(move_slot) => move_slot.id,
                None => return 0,
            },
            QueuedAction::Move(None) => self.dex.struggle(),
            QueuedAction::Switch(_) => return 0,
        };
        self.dex.move_data(move_id).priority
    }

    fn next_actor(&mut self, queue: &[Option<QueuedAction>; 2]) -> Option<SideId> {
        match (queue[0], queue[1]) {
            (None, None) => None,
            (Some(_), None) => Some(SideId::P1),
            (None, Some(_)) => Some(SideId::P2),
            (Some(first), Some(second)) => {
                let key = |engine: &Self, side, action| {
                    (
                        matches!(action, QueuedAction::Switch(_)),
                        engine.priority(side, action),
                    )
                };
                // Speed is only computed when switching and priority do not decide.
                match key(self, SideId::P1, first).cmp(&key(self, SideId::P2, second)) {
                    Ordering::Greater => Some(SideId::P1),
                    Ordering::Less => Some(SideId::P2),
                    Ordering::Equal => Some(self.faster_side()),
                }
            }
        }
    }

    /// The side whose active creature is faster. A tie is broken with one roll, as Showdown's
    /// two-element shuffle does.
    ///
    /// Deliberate difference: Showdown also re-sorts, and so re-rolls, speed ties at every
    /// `Update` and `runSwitch` and for each tied residual group. pkmn only rolls where the
    /// order changes an outcome, so speed-tied battles draw fewer random numbers than
    /// Showdown's from the first tie on.
    fn faster_side(&mut self) -> SideId {
        match self
            .action_speed(SideId::P1)
            .cmp(&self.action_speed(SideId::P2))
        {
            Ordering::Greater => SideId::P1,
            Ordering::Less => SideId::P2,
            Ordering::Equal => {
                if self.state.prng.below(2) == 0 {
                    SideId::P1
                } else {
                    SideId::P2
                }
            }
        }
    }

    /// Both sides ordered fastest first.
    fn speed_order(&mut self) -> [SideId; 2] {
        let first = self.faster_side();
        [first, first.foe()]
    }

    fn emit_switch(&mut self, side: SideId) {
        let team = &self.state.sides[side.index()];
        let pokemon = team.active();
        let event = Event::Switch {
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
        let team = &mut self.state.sides[side.index()];
        team.active = slot;
        team.switch_flag = false;
        // Showdown swaps the incoming creature into the active position of `side.pokemon`.
        if let Some(position) = team.switch_order.iter().position(|&member| member == slot) {
            team.switch_order.swap(0, position);
        }
        let incoming = team.active_mut();
        incoming.active_turns = 0;
        incoming.status_state.stage = 0;
        self.emit_switch(side);
    }

    /// Showdown's `dragIn`: a forced switch picks a random replacement from
    /// `possibleSwitches`, cancels the dragged-out creature's action, and runs the switch-in.
    fn drag_in(&mut self, side: SideId, queue: &mut [Option<QueuedAction>; 2]) {
        let candidates: Vec<usize> = self.state.side(side).drag_candidates().collect();
        let Ok(count) = u32::try_from(candidates.len()) else {
            return;
        };
        if count == 0 || self.active(side).is_fainted() {
            return;
        }
        let index = usize::try_from(self.state.prng.below(count)).unwrap_or(0);
        self.switch_in(side, candidates[index]);
        queue[side.index()] = None;
        self.run_switch_in([side]);
    }

    /// Whether the creature touches the ground: not immune to `grounded_type` by the type chart
    /// or an `immunity` handler (Showdown's `isGrounded`), and not in the air mid-charge.
    fn is_grounded(&self, side: SideId, grounded_type: crate::dex::TypeId) -> bool {
        let pokemon = self.active(side);
        let immune_by_handler = self.mask(side).intersects(HandlerMask::TRY_HIT)
            && self
                .handlers(side)
                .any(|(_, handler)| *handler == Handler::Immunity(grounded_type));
        !immune_by_handler
            && self
                .dex
                .type_modifier(grounded_type, pokemon.types())
                .is_some()
    }

    /// Whether the creature is out of reach while charging a move like Fly.
    fn is_semi_invulnerable(&self, side: SideId) -> bool {
        let pokemon = self.active(side);
        pokemon.volatiles.charging.is_some_and(|slot| {
            pokemon.move_slots[usize::from(slot)].is_some_and(|move_slot| {
                self.dex
                    .move_data(move_slot.id)
                    .charge
                    .as_ref()
                    .is_some_and(|charge| charge.semi_invulnerable)
            })
        })
    }

    /// The terrain, if `relevant` says it matters here and the creature is grounded and so
    /// affected by it. Grounding is only worked out when the terrain is relevant.
    fn terrain_affecting(
        &self,
        side: SideId,
        relevant: impl Fn(&crate::dex::TerrainData) -> bool,
    ) -> Option<&'a crate::dex::TerrainData> {
        let dex = self.dex;
        let terrain = dex.terrain(self.state.field.terrain?.id);
        (relevant(terrain)
            && self.is_grounded(side, terrain.grounded_type)
            && !self.is_semi_invulnerable(side))
        .then_some(terrain)
    }

    fn set_terrain(&mut self, id: crate::dex::TerrainId) -> bool {
        if self
            .state
            .field
            .terrain
            .is_some_and(|terrain| terrain.id == id)
        {
            return false;
        }
        self.state.field.terrain = Some(super::state::TerrainState {
            id,
            duration: self.dex.terrain(id).duration,
        });
        self.emit(Event::Terrain { terrain: Some(id) });
        true
    }

    fn clear_terrain(&mut self) -> bool {
        if self.state.field.terrain.take().is_none() {
            return false;
        }
        self.emit(Event::Terrain { terrain: None });
        true
    }

    /// Runs `onStart` abilities and items for creatures that just switched in, fastest first.
    fn run_switch_in(&mut self, sides: impl IntoIterator<Item = SideId>) {
        let mut entering = [false; 2];
        for side in sides {
            entering[side.index()] = true;
        }
        let order = match entering {
            [true, true] => self.speed_order(),
            _ => SideId::BOTH,
        };
        // Entry hazards land before abilities, so a creature they knock out never starts.
        for side in order {
            if entering[side.index()] {
                self.entry_hazards(side);
            }
        }
        for side in order {
            if !entering[side.index()]
                || self.active(side).is_fainted()
                || !self.mask(side).intersects(HandlerMask::START)
            {
                continue;
            }
            for (effect, handler) in self.handlers(side) {
                match handler {
                    Handler::StartWeather(weather) => {
                        if self.weather_id() != Some(*weather) {
                            self.announce(side, effect);
                            self.set_weather(*weather);
                        }
                    }
                    Handler::StartTerrain(terrain) => {
                        if self.state.field.terrain.map(|state| state.id) != Some(*terrain) {
                            self.announce(side, effect);
                            self.set_terrain(*terrain);
                        }
                    }
                    Handler::StartFoeBoosts(boosts) => {
                        let foe = side.foe();
                        let foe_pokemon = self.active(foe);
                        if !foe_pokemon.is_fainted() && foe_pokemon.volatiles.substitute.is_none() {
                            self.announce(side, effect);
                            self.boost(foe, *boosts);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// Damage from the side's entry hazards to a creature that just switched in.
    fn entry_hazards(&mut self, side: SideId) {
        let dex = self.dex;
        for index in 0..self.state.side(side).conditions.len() {
            let condition = self.state.side(side).conditions[index];
            let Some(hazard) = &dex.side_condition(condition.id).switch_in_damage else {
                continue;
            };
            let pokemon = self.active(side);
            if pokemon.is_fainted() {
                return;
            }
            if hazard
                .grounded_type
                .is_some_and(|grounded_type| !self.is_grounded(side, grounded_type))
            {
                continue;
            }
            let layer = usize::from(condition.layers.max(1)) - 1;
            let fraction = hazard.layers[layer.min(hazard.layers.len() - 1)];
            // Showdown ignores immunities here: `runEffectiveness`, clamped to ±6.
            let effectiveness = hazard.type_id.map_or(0, |type_id| {
                pokemon
                    .types()
                    .map(|defender| dex.type_modifier(type_id, [defender]).unwrap_or(0))
                    .sum::<i8>()
                    .clamp(-6, 6)
            });
            let scaled = u64::from(pokemon.max_hp()) * u64::from(fraction.numerator);
            let divisor = u64::from(fraction.denominator);
            let shift = u32::from(effectiveness.unsigned_abs());
            let amount = if effectiveness >= 0 {
                (scaled << shift) / divisor
            } else {
                scaled / (divisor << shift)
            };
            let amount = u32::try_from(amount).unwrap_or(u32::MAX).max(1);
            self.damage(side, amount, DamageSource::Hazard(condition.id));
        }
    }

    /// Showdown's `Update` event: items that react to HP or status get a chance to trigger,
    /// fastest creature first.
    fn update(&mut self) {
        let reacts = SideId::BOTH.map(|side| {
            !self.active(side).is_fainted() && self.mask(side).intersects(HandlerMask::UPDATE)
        });
        let order = match reacts {
            [false, false] => return,
            [true, true] => self.speed_order(),
            _ => SideId::BOTH,
        };
        for side in order {
            if !reacts[side.index()] || self.active(side).is_fainted() {
                continue;
            }
            for (effect, handler) in self.handlers(side) {
                // A one-shot handler may have used the item up earlier in this loop.
                if !self.holds(side, effect) {
                    continue;
                }
                match *handler {
                    Handler::HealAtThreshold { threshold, amount } => {
                        let pokemon = self.active(side);
                        if threshold.covers(pokemon.hp, pokemon.max_hp()) && !pokemon.is_fainted() {
                            let restore = amount.of_floored(u32::from(pokemon.max_hp())).max(1);
                            self.trigger(side, effect);
                            self.heal(side, restore, HealSource::Effect(effect));
                        }
                    }
                    Handler::CureStatus => {
                        let pokemon = self.active(side);
                        if pokemon.status.is_some() || pokemon.volatiles.confusion.is_some() {
                            self.cure(side, effect);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// A `cureStatus` handler: removes the status and confusion.
    fn cure(&mut self, side: SideId, effect: Effect) {
        self.trigger(side, effect);
        self.cure_status(side);
        if self.active(side).volatiles.confusion.is_some() {
            self.active_mut(side).volatiles.confusion = None;
            self.emit(Event::End {
                side,
                volatile: crate::dex::VolatileStatus::Confusion,
            });
        }
    }

    /// Whether the active creature still has the ability or item.
    fn holds(&self, side: SideId, effect: Effect) -> bool {
        let pokemon = self.active(side);
        match effect {
            Effect::Ability(ability) => pokemon.ability == Some(ability),
            Effect::Item(item) => pokemon.item == Some(item),
        }
    }

    /// Reports a one-shot handler triggering. A consumable item is used up and only
    /// `-enditem` is sent, as Showdown does for berries and Focus Sash; anything else is
    /// announced with `-ability` or `-item`.
    fn trigger(&mut self, side: SideId, effect: Effect) {
        match effect {
            Effect::Item(item) if self.dex.item(item).consumable => {
                self.active_mut(side).item = None;
                self.emit(Event::EndItem { side, item });
            }
            _ => self.announce(side, effect),
        }
    }

    fn set_weather(&mut self, id: WeatherId) -> bool {
        if self.weather_id() == Some(id) {
            return false;
        }
        self.state.field.weather = Some(WeatherState {
            id,
            duration: self.dex.weather(id).duration,
        });
        self.emit(Event::Weather { weather: Some(id) });
        true
    }

    /// Applies stat stages and returns whether any changed.
    fn boost(&mut self, side: SideId, boosts: Boosts) -> bool {
        if self.active(side).is_fainted() {
            return false;
        }
        let mut changed = false;
        for (stat, stages) in boosts.changes() {
            changed |= self.boost_stat(side, stat, stages);
        }
        changed
    }

    fn boost_stat(&mut self, side: SideId, stat: BoostStat, stages: i8) -> bool {
        let applied = self.active_mut(side).boosts.apply(stat, stages);
        if applied != 0 {
            self.emit(Event::Boost {
                side,
                stat,
                stages: applied,
            });
        }
        applied != 0
    }

    fn cure_status(&mut self, side: SideId) {
        if let Some(status) = self.active_mut(side).status.take() {
            self.emit(Event::CureStatus { side, status });
        }
    }

    /// Removes up to `amount` HP and returns how much was actually lost.
    ///
    /// Damage from a move or confusion that would knock out a creature at full HP is first
    /// offered to `endureFromFull` handlers, ability before item, like Showdown's `onDamage`.
    fn damage(&mut self, side: SideId, amount: u32, from: DamageSource) -> u32 {
        let pokemon = self.active(side);
        if pokemon.is_fainted() || amount == 0 {
            return 0;
        }
        let mut amount = amount;
        let from_move = matches!(from, DamageSource::Move | DamageSource::Confusion);
        if from_move
            && pokemon.hp == pokemon.max_hp()
            && amount >= u32::from(pokemon.hp)
            && self.mask(side).intersects(HandlerMask::DAMAGE)
        {
            let endure = self
                .handlers(side)
                .find(|(_, handler)| **handler == Handler::EndureFromFull)
                .map(|(effect, _)| effect);
            if let Some(effect) = endure {
                self.trigger(side, effect);
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
        self.emit(Event::Damage {
            side,
            amount: dealt,
            hp,
            from,
        });
        if hp == 0 {
            self.faint_queue.push(side);
        }
        u32::from(dealt)
    }

    /// Restores up to `amount` HP and returns how much was actually restored.
    fn heal(&mut self, side: SideId, amount: u32, from: HealSource) -> u32 {
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
        self.emit(Event::Heal {
            side,
            amount: restored,
            hp,
            from,
        });
        u32::from(restored)
    }

    /// Showdown's `faintMessages`: announces queued faints and ends the battle if a side is
    /// out of creatures. Returns whether the battle ended.
    ///
    /// When both sides run out at once, the side whose creature fainted last wins, as in
    /// Generation 5 onward (for example, an attacker knocked out by its own recoil).
    fn faint_messages(&mut self) -> bool {
        let mut last_fainted = None;
        for side in self.faint_queue.take() {
            self.emit(Event::Faint { side });
            last_fainted = Some(side);
        }
        if last_fainted.is_none() {
            return false;
        }
        let defeated = SideId::BOTH.map(|side| self.state.side(side).is_defeated());
        let outcome = match defeated {
            [true, true] => last_fainted.map_or(Outcome::Tie, Outcome::Win),
            [true, false] => Outcome::Win(SideId::P2),
            [false, true] => Outcome::Win(SideId::P1),
            [false, false] => return false,
        };
        self.state.outcome = Some(outcome);
        self.emit(match outcome {
            Outcome::Win(side) => Event::Win { side },
            Outcome::Tie => Event::Tie,
        });
        true
    }

    /// Starts the next turn unless the battle is over or a side must first switch in a
    /// replacement. Like Showdown, the turn counter and `activeTurns` advance only then.
    fn next_turn(&mut self) {
        if self.state.outcome.is_some() || self.state.awaiting_switch() {
            return;
        }
        for side in SideId::BOTH {
            let active = self.active_mut(side);
            active.active_turns = active.active_turns.saturating_add(1);
        }
        self.state.turn = self.state.turn.saturating_add(1);
        let turn = self.state.turn;
        self.emit(Event::Turn { turn });
    }

    fn status_damage(status: Status, max_hp: u32, stage: u8) -> u32 {
        match status {
            Status::Burn => (max_hp / 16).max(1),
            Status::Poison => (max_hp / 8).max(1),
            Status::Toxic => (max_hp / 16).max(1) * u32::from(stage),
            Status::Paralysis | Status::Sleep | Status::Freeze => 0,
        }
    }
}
