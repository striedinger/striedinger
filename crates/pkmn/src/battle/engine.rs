//! Turn resolution. The engine borrows the content and state separately so move data can be
//! read while the state is mutated.

use std::cmp::Ordering;

use super::damage::{DAMAGE_ROLLS, DamageInput, calculate_damage};
use super::events::{CantMoveReason, DamageCause, Event, HealCause};
use super::request::Choice;
use super::state::{ActiveWeather, BattleState, Outcome, Pokemon, SideId, StatusCondition};
use crate::dex::{
    Dex, EffectKind, EffectTarget, MoveCategory, MoveData, MoveEffect, MoveTarget, Recoil,
    StatusKind, WeatherData,
};
use crate::stats::{
    BoostStat, Stat, apply_accuracy_stage, apply_modifier, apply_stage, saturate_u16,
};

/// Gen 5+ odds for moves that hit two to five times: 35%, 35%, 15%, 15%.
const TWO_TO_FIVE_HITS: [u8; 20] = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5];
/// Gen 7+ critical-hit odds are one in each denominator, by stage.
const CRIT_DENOMINATORS: [u32; 4] = [24, 8, 2, 1];
/// Base power of a confusion self-hit.
const CONFUSION_POWER: u16 = 40;
/// Toxic damage stops growing after this many sixteenths.
const MAX_TOXIC_STAGE: u8 = 15;

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
    pub dex: &'a Dex,
    pub state: &'a mut BattleState,
    pub events: &'a mut Vec<Event>,
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

    fn weather(&self) -> Option<&'a WeatherData> {
        let dex = self.dex;
        self.state
            .field
            .weather
            .map(|weather| dex.weather(weather.id))
    }

    pub fn start(&mut self) {
        for side in SideId::BOTH {
            self.emit_switched_in(side);
        }
        self.state.turn = 1;
        self.emit(Event::TurnStarted { turn: 1 });
    }

    /// Runs validated choices: replacements between turns, or a full turn.
    pub fn run(&mut self, choices: [Choice; 2]) {
        if self.state.awaiting_replacements() {
            for side in self.speed_order() {
                if let Choice::Switch(slot) = choices[side.index()] {
                    self.switch_in(side, slot);
                }
            }
            self.begin_turn_if_ready();
        } else {
            self.run_turn(choices);
        }
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
                Action::Switch(slot) => self.switch_in(side, slot),
                Action::Move(slot) => {
                    if !self.active(side).is_fainted() {
                        self.use_move(side, slot);
                    }
                }
            }
            if self.resolve_faints() {
                return;
            }
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
                        engine.speed(side),
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

    fn random_side(&mut self) -> SideId {
        if self.state.prng.below(2) == 0 {
            SideId::P1
        } else {
            SideId::P2
        }
    }

    /// Both sides ordered fastest first, with speed ties broken at random.
    fn speed_order(&mut self) -> [SideId; 2] {
        let first = match self.speed(SideId::P1).cmp(&self.speed(SideId::P2)) {
            Ordering::Greater => SideId::P1,
            Ordering::Less => SideId::P2,
            Ordering::Equal => self.random_side(),
        };
        [first, first.opponent()]
    }

    fn speed(&self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let speed = apply_stage(pokemon.stats.speed, pokemon.boosts.get(BoostStat::Speed));
        if pokemon.status == Some(StatusCondition::Paralysis) {
            speed / 2
        } else {
            speed
        }
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
        outgoing.boosts = crate::stats::Boosts::default();
        outgoing.volatiles = super::state::Volatiles::default();
        if let Some(StatusCondition::Toxic { stage }) = &mut outgoing.status {
            *stage = 0;
        }
        self.state.sides[side.index()].active = slot;
        self.emit_switched_in(side);
    }

    fn use_move(&mut self, side: SideId, slot: Option<usize>) {
        if !self.can_move(side) {
            return;
        }
        let dex = self.dex;
        let move_id = match slot.and_then(|slot| self.active_mut(side).moves[slot].as_mut()) {
            Some(move_slot) => {
                move_slot.pp = move_slot.pp.saturating_sub(1);
                move_slot.id
            }
            None => dex.struggle(),
        };
        self.emit(Event::MoveUsed { side, move_id });
        let move_data = dex.move_data(move_id);
        let target = match move_data.target {
            MoveTarget::User => side,
            MoveTarget::Opponent => side.opponent(),
        };
        if move_data.target == MoveTarget::Opponent {
            if self.active(target).is_fainted() {
                self.emit(Event::Failed { side });
                return;
            }
            let checks_immunity = move_data.is_damaging() || move_data.respects_type_immunity;
            if checks_immunity && self.type_modifier(move_data, target).is_none() {
                self.emit(Event::Immune { side: target });
                return;
            }
            if !self.accuracy_check(side, target, move_data) {
                self.emit(Event::Missed { side });
                return;
            }
        }
        if move_data.is_damaging() {
            self.use_damaging_move(side, target, move_data);
        } else {
            self.use_status_move(side, target, move_data);
        }
    }

    /// Runs the pre-move checks in the order the games do: sleep, freeze, flinch, confusion,
    /// then paralysis.
    fn can_move(&mut self, side: SideId) -> bool {
        match self.active(side).status {
            Some(StatusCondition::Sleep { turns_left }) => {
                let turns_left = turns_left.saturating_sub(1);
                if turns_left > 0 {
                    self.active_mut(side).status = Some(StatusCondition::Sleep { turns_left });
                    self.emit(Event::CantMove {
                        side,
                        reason: CantMoveReason::Asleep,
                    });
                    return false;
                }
                self.cure_status(side);
            }
            Some(StatusCondition::Freeze) => {
                if !self.state.prng.chance(1, 5) {
                    self.emit(Event::CantMove {
                        side,
                        reason: CantMoveReason::Frozen,
                    });
                    return false;
                }
                self.cure_status(side);
            }
            _ => {}
        }
        if self.active(side).volatiles.flinched {
            self.emit(Event::CantMove {
                side,
                reason: CantMoveReason::Flinched,
            });
            return false;
        }
        let confusion_turns = self.active(side).volatiles.confusion_turns;
        if confusion_turns > 0 {
            let confusion_turns = confusion_turns - 1;
            self.active_mut(side).volatiles.confusion_turns = confusion_turns;
            if confusion_turns == 0 {
                self.emit(Event::ConfusionEnded { side });
            } else {
                self.emit(Event::ConfusionActivated { side });
                if self.state.prng.chance(33, 100) {
                    self.emit(Event::CantMove {
                        side,
                        reason: CantMoveReason::HurtItselfInConfusion,
                    });
                    let damage = self.confusion_damage(side);
                    self.damage(side, damage, DamageCause::Confusion);
                    return false;
                }
            }
        }
        if self.active(side).status == Some(StatusCondition::Paralysis)
            && self.state.prng.chance(1, 4)
        {
            self.emit(Event::CantMove {
                side,
                reason: CantMoveReason::Paralyzed,
            });
            return false;
        }
        true
    }

    fn type_modifier(&self, move_data: &MoveData, target: SideId) -> Option<i8> {
        match move_data.move_type {
            Some(move_type) => self
                .dex
                .type_modifier(move_type, self.active(target).types()),
            None => Some(0),
        }
    }

    fn accuracy_check(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        let Some(accuracy) = move_data.accuracy else {
            return true;
        };
        let stage = self.active(side).boosts.get(BoostStat::Accuracy)
            - self.active(target).boosts.get(BoostStat::Evasion);
        let accuracy = apply_accuracy_stage(u32::from(accuracy), stage.clamp(-6, 6));
        self.state.prng.chance(accuracy, 100)
    }

    fn use_damaging_move(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let hits = self.roll_hits(move_data);
        let mut landed = 0;
        let mut total_damage = 0;
        for _ in 0..hits {
            if self.active(target).is_fainted() || self.active(side).is_fainted() {
                break;
            }
            landed += 1;
            total_damage += self.hit(side, target, move_data);
            for effect in &move_data.effects {
                if effect.target == EffectTarget::Target && self.roll_effect_chance(effect) {
                    self.apply_effect(target, effect.kind);
                }
            }
        }
        if move_data.hits.max > 1 {
            self.emit(Event::HitCount { hits: landed });
        }
        if self.active(side).is_fainted() {
            return;
        }
        for effect in &move_data.effects {
            if effect.target == EffectTarget::User && self.roll_effect_chance(effect) {
                self.apply_effect(side, effect.kind);
            }
        }
        let max_hp = u32::from(self.active(side).max_hp());
        let recoil = match move_data.recoil {
            Some(Recoil::DamageDealt(fraction)) if total_damage > 0 => {
                Some(fraction.of_rounded(total_damage))
            }
            Some(Recoil::MaxHp(fraction)) => Some(fraction.of_rounded(max_hp)),
            _ => None,
        };
        if let Some(recoil) = recoil {
            self.damage(side, recoil.max(1), DamageCause::Recoil);
        }
    }

    fn roll_hits(&mut self, move_data: &MoveData) -> u8 {
        let range = move_data.hits;
        if range.min == range.max {
            return range.min;
        }
        if (range.min, range.max) == (2, 5) {
            let index = self.state.prng.below(20);
            return TWO_TO_FIVE_HITS[usize::try_from(index).unwrap_or(0)];
        }
        let hits = self
            .state
            .prng
            .range(u32::from(range.min), u32::from(range.max) + 1);
        u8::try_from(hits).unwrap_or(range.max)
    }

    /// Lands one hit and returns the damage dealt.
    fn hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> u32 {
        let stage = (usize::from(move_data.crit_stage) + 1).min(CRIT_DENOMINATORS.len());
        let critical = self.state.prng.chance(1, CRIT_DENOMINATORS[stage - 1]);
        let type_modifier = self.type_modifier(move_data, target).unwrap_or(0);
        let damage = self.move_damage(side, target, move_data, critical, type_modifier);
        if critical {
            self.emit(Event::CriticalHit { side: target });
        }
        match type_modifier.cmp(&0) {
            Ordering::Greater => self.emit(Event::SuperEffective { side: target }),
            Ordering::Less => self.emit(Event::NotVeryEffective { side: target }),
            Ordering::Equal => {}
        }
        let dealt = self.damage(target, damage, DamageCause::Move);
        if let Some(drain) = move_data.drain
            && dealt > 0
        {
            self.heal(side, drain.of_rounded(dealt).max(1), HealCause::Drain);
        }
        let thaws = move_data
            .move_type
            .is_some_and(|move_type| self.dex.type_data(move_type).thaws_frozen_targets);
        if thaws && self.active(target).status == Some(StatusCondition::Freeze) {
            self.cure_status(target);
        }
        dealt
    }

    fn move_damage(
        &mut self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        critical: bool,
        type_modifier: i8,
    ) -> u32 {
        let (attack_stat, attack_boost, defense_stat, defense_boost) = match move_data.category {
            MoveCategory::Special => (
                Stat::SpecialAttack,
                BoostStat::SpecialAttack,
                Stat::SpecialDefense,
                BoostStat::SpecialDefense,
            ),
            MoveCategory::Physical | MoveCategory::Status => (
                Stat::Attack,
                BoostStat::Attack,
                Stat::Defense,
                BoostStat::Defense,
            ),
        };
        let attacker = self.active(side);
        let defender = self.active(target);
        let mut attack_stage = attacker.boosts.get(attack_boost);
        let mut defense_stage = defender.boosts.get(defense_boost);
        if critical {
            attack_stage = attack_stage.max(0);
            defense_stage = defense_stage.min(0);
        }
        let attack = apply_stage(attacker.stats.get(attack_stat), attack_stage);
        let mut defense = apply_stage(defender.stats.get(defense_stat), defense_stage);
        let weather = self.weather();
        if let Some(weather) = weather {
            for boost in &weather.defense_boosts {
                if boost.stat == defense_stat && defender.has_type(boost.type_id) {
                    defense = apply_modifier(defense, boost.modifier);
                }
            }
        }
        let weather_modifier = weather.and_then(|weather| {
            weather
                .damage_modifiers
                .iter()
                .find(|(type_id, _)| Some(*type_id) == move_data.move_type)
                .map(|&(_, modifier)| modifier)
        });
        let input = DamageInput {
            level: attacker.level,
            power: move_data.power,
            attack,
            defense,
            weather_modifier,
            critical,
            roll: 0,
            same_type_attack_bonus: move_data
                .move_type
                .is_some_and(|move_type| attacker.has_type(move_type)),
            type_modifier,
            burned: move_data.category == MoveCategory::Physical
                && attacker.status == Some(StatusCondition::Burn),
        };
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }

    fn confusion_damage(&mut self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let input = DamageInput {
            level: pokemon.level,
            power: CONFUSION_POWER,
            attack: apply_stage(pokemon.stats.attack, pokemon.boosts.get(BoostStat::Attack)),
            defense: apply_stage(
                pokemon.stats.defense,
                pokemon.boosts.get(BoostStat::Defense),
            ),
            weather_modifier: None,
            critical: false,
            roll: 0,
            same_type_attack_bonus: false,
            type_modifier: 0,
            burned: false,
        };
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }

    fn use_status_move(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let mut any_applied = false;
        for effect in &move_data.effects {
            if self.roll_effect_chance(effect) {
                let recipient = match effect.target {
                    EffectTarget::User => side,
                    EffectTarget::Target => target,
                };
                any_applied |= self.apply_effect(recipient, effect.kind);
            }
        }
        if !any_applied {
            self.emit(Event::Failed { side });
        }
    }

    fn roll_effect_chance(&mut self, effect: &MoveEffect) -> bool {
        effect
            .chance
            .is_none_or(|chance| self.state.prng.chance(u32::from(chance), 100))
    }

    /// Applies an effect and returns whether it changed anything.
    fn apply_effect(&mut self, recipient: SideId, kind: EffectKind) -> bool {
        if self.active(recipient).is_fainted() {
            return false;
        }
        match kind {
            EffectKind::Boost { stat, stages } => {
                let applied = self.active_mut(recipient).boosts.apply(stat, stages);
                if applied != 0 {
                    self.emit(Event::StatChanged {
                        side: recipient,
                        stat,
                        stages: applied,
                    });
                }
                applied != 0
            }
            EffectKind::Status(status) => self.inflict_status(recipient, status),
            EffectKind::Confuse => {
                if self.active(recipient).volatiles.confusion_turns > 0 {
                    return false;
                }
                let turns = self.state.prng.range(2, 6);
                self.active_mut(recipient).volatiles.confusion_turns =
                    u8::try_from(turns).unwrap_or(2);
                self.emit(Event::ConfusionStarted { side: recipient });
                true
            }
            EffectKind::Flinch => {
                self.active_mut(recipient).volatiles.flinched = true;
                true
            }
            EffectKind::Weather(id) => {
                if self
                    .state
                    .field
                    .weather
                    .is_some_and(|weather| weather.id == id)
                {
                    return false;
                }
                self.state.field.weather = Some(ActiveWeather {
                    id,
                    turns_left: self.dex.weather(id).duration,
                });
                self.emit(Event::WeatherStarted { weather: id });
                true
            }
            EffectKind::Heal(fraction) => {
                let max_hp = u32::from(self.active(recipient).max_hp());
                let amount = apply_modifier(max_hp, fraction.to_modifier());
                self.heal(recipient, amount, HealCause::Move) > 0
            }
        }
    }

    fn inflict_status(&mut self, side: SideId, status: StatusKind) -> bool {
        let pokemon = self.active(side);
        if pokemon.status.is_some() {
            return false;
        }
        let group = status.immunity_group();
        let immune = pokemon.types().any(|type_id| {
            self.dex
                .type_data(type_id)
                .status_immunities
                .contains(&group)
        });
        let prevented = self
            .weather()
            .is_some_and(|weather| weather.prevents_statuses.contains(&status));
        if immune || prevented {
            return false;
        }
        let condition = match status {
            StatusKind::Burn => StatusCondition::Burn,
            StatusKind::Paralysis => StatusCondition::Paralysis,
            StatusKind::Poison => StatusCondition::Poison,
            StatusKind::Toxic => StatusCondition::Toxic { stage: 0 },
            StatusKind::Sleep => StatusCondition::Sleep {
                turns_left: u8::try_from(self.state.prng.range(2, 5)).unwrap_or(2),
            },
            StatusKind::Freeze => StatusCondition::Freeze,
        };
        self.active_mut(side).status = Some(condition);
        self.emit(Event::StatusInflicted { side, status });
        true
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
    fn damage(&mut self, side: SideId, amount: u32, cause: DamageCause) -> u32 {
        let pokemon = self.active_mut(side);
        if pokemon.is_fainted() || amount == 0 {
            return 0;
        }
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

    /// End-of-turn effects in the games' order: weather, then burn and poison.
    fn end_of_turn(&mut self) {
        let order = self.speed_order();
        if let Some(mut weather) = self.state.field.weather {
            weather.turns_left = weather.turns_left.saturating_sub(1);
            if weather.turns_left == 0 {
                self.state.field.weather = None;
                self.emit(Event::WeatherEnded {
                    weather: weather.id,
                });
            } else {
                self.state.field.weather = Some(weather);
                let data = self.dex.weather(weather.id);
                if let Some(fraction) = data.residual_damage {
                    for side in order {
                        let pokemon = self.active(side);
                        let immune = data
                            .residual_damage_immune_types
                            .iter()
                            .any(|&type_id| pokemon.has_type(type_id));
                        if !immune {
                            let amount = fraction.of_floored(u32::from(pokemon.max_hp()));
                            self.damage(side, amount.max(1), DamageCause::Weather);
                        }
                    }
                }
            }
        }
        for side in order {
            let pokemon = self.active_mut(side);
            if pokemon.is_fainted() {
                continue;
            }
            let max_hp = u32::from(pokemon.max_hp());
            let amount = match &mut pokemon.status {
                Some(StatusCondition::Burn) => (max_hp / 16).max(1),
                Some(StatusCondition::Poison) => (max_hp / 8).max(1),
                Some(StatusCondition::Toxic { stage }) => {
                    *stage = (*stage + 1).min(MAX_TOXIC_STAGE);
                    (max_hp / 16).max(1) * u32::from(*stage)
                }
                _ => continue,
            };
            self.damage(side, amount, DamageCause::Status);
        }
        for side in SideId::BOTH {
            self.active_mut(side).volatiles.flinched = false;
        }
        if self.resolve_faints() {
            return;
        }
        self.state.turn += 1;
        self.begin_turn_if_ready();
    }

    fn begin_turn_if_ready(&mut self) {
        if self.state.outcome.is_none() && !self.state.awaiting_replacements() {
            let turn = self.state.turn;
            self.emit(Event::TurnStarted { turn });
        }
    }
}
