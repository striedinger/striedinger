//! Using a move, following Showdown's `runMove`, the `hitStep` sequence, and `spreadMoveHit`.

use std::cmp::Ordering;

use super::Engine;
use crate::battle::events::{CantReason, DamageSource, Effect, Event, HealSource};
use crate::battle::state::SideId;
use crate::dex::{Handler, HandlerMask, MoveData, MoveEffect, MoveTarget, Status, VolatileStatus};
use crate::stats::apply_accuracy_stage;

/// Gen 5+ odds for moves that hit two to five times: 35%, 35%, 15%, 15%.
const TWO_TO_FIVE_HITS: [u8; 20] = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5];
/// Gen 7+ critical-hit odds by `critRatio`: one in each denominator.
const CRIT_DENOMINATORS: [u32; 5] = [0, 24, 8, 2, 1];

impl Engine<'_> {
    /// Showdown's `runMove`: pre-move checks, PP, then the move itself.
    pub(super) fn run_move(&mut self, side: SideId, slot: Option<usize>) {
        if !self.before_move(side) {
            return;
        }
        let dex = self.dex;
        let locks = self.mask(side).intersects(HandlerMask::CHOICE_LOCK);
        let user = self.active_mut(side);
        let move_id = match slot {
            Some(slot) => {
                let Some(move_slot) = user.move_slots[slot].as_mut() else {
                    return;
                };
                move_slot.pp = move_slot.pp.saturating_sub(1);
                let id = move_slot.id;
                if locks && user.volatiles.choice_lock.is_none() {
                    user.volatiles.choice_lock = u8::try_from(slot).ok();
                }
                id
            }
            None => dex.struggle(),
        };
        self.emit(Event::Move { side, move_id });
        let move_data = dex.move_data(move_id);
        let target = match move_data.target {
            MoveTarget::User => side,
            MoveTarget::Normal => side.foe(),
        };
        if move_data.target == MoveTarget::Normal && !self.try_hit(side, target, move_data) {
            return;
        }
        if move_data.is_damaging() {
            self.hit_loop(side, target, move_data);
        } else {
            self.status_move_hit(side, target, move_data);
        }
    }

    /// Showdown's `onBeforeMove` handlers in priority order: sleep and freeze, flinch,
    /// confusion, then paralysis.
    fn before_move(&mut self, side: SideId) -> bool {
        match self.active(side).status {
            Some(Status::Sleep) => {
                let pokemon = self.active_mut(side);
                pokemon.status_state.time = pokemon.status_state.time.saturating_sub(1);
                if pokemon.status_state.time > 0 {
                    self.emit(Event::Cant {
                        side,
                        reason: CantReason::Sleep,
                    });
                    return false;
                }
                self.cure_status(side);
            }
            Some(Status::Freeze) => {
                if !self.state.prng.chance(1, 5) {
                    self.emit(Event::Cant {
                        side,
                        reason: CantReason::Freeze,
                    });
                    return false;
                }
                self.cure_status(side);
            }
            _ => {}
        }
        if self.active(side).volatiles.flinch {
            self.emit(Event::Cant {
                side,
                reason: CantReason::Flinch,
            });
            return false;
        }
        if let Some(time) = self.active(side).volatiles.confusion {
            let time = time.saturating_sub(1);
            if time == 0 {
                self.active_mut(side).volatiles.confusion = None;
                self.emit(Event::End {
                    side,
                    volatile: VolatileStatus::Confusion,
                });
            } else {
                self.active_mut(side).volatiles.confusion = Some(time);
                self.emit(Event::Activate {
                    side,
                    volatile: VolatileStatus::Confusion,
                });
                if self.state.prng.chance(33, 100) {
                    let damage = self.confusion_damage(side);
                    self.damage(side, damage, DamageSource::Confusion);
                    return false;
                }
            }
        }
        if self.active(side).status == Some(Status::Paralysis) && self.state.prng.chance(1, 4) {
            self.emit(Event::Cant {
                side,
                reason: CantReason::Paralysis,
            });
            return false;
        }
        true
    }

    /// Showdown's hit steps before damage: a target exists, `onTryHit` (absorbing abilities),
    /// type immunity, then accuracy. Returns whether the move goes on to hit.
    fn try_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        if self.active(target).is_fainted() {
            self.emit(Event::Fail { side });
            return false;
        }
        let try_hit_handlers = self.mask(target).intersects(HandlerMask::TRY_HIT);
        if let Some(move_type) = move_data.move_type.filter(|_| try_hit_handlers) {
            let absorb = self
                .handlers(target)
                .find_map(|(effect, handler)| match *handler {
                    Handler::Absorb {
                        move_type: absorbed,
                        heal,
                        boosts,
                    } if absorbed == move_type => Some((effect, heal, boosts)),
                    _ => None,
                });
            if let Some((effect, heal, boosts)) = absorb {
                let max_hp = u32::from(self.active(target).max_hp());
                let healed = heal.is_some_and(|fraction| {
                    self.heal(
                        target,
                        fraction.of_floored(max_hp).max(1),
                        HealSource::Effect(effect),
                    ) > 0
                });
                // A heal names its source; boosts and immunity are announced instead.
                if boosts.is_some() || !healed {
                    self.announce(target, effect);
                }
                let boosted = boosts.is_some_and(|boosts| self.boost(target, boosts));
                if !healed && !boosted {
                    self.emit(Event::Immune { side: target });
                }
                return false;
            }
        }
        if !move_data.ignore_immunity {
            let immunity = move_data
                .move_type
                .filter(|_| try_hit_handlers)
                .and_then(|move_type| {
                    self.handlers(target).find_map(|(effect, handler)| {
                        (*handler == Handler::Immunity(move_type)).then_some(effect)
                    })
                });
            if let Some(effect) = immunity {
                self.announce(target, effect);
                self.emit(Event::Immune { side: target });
                return false;
            }
            if self.type_modifier(move_data, target).is_none() {
                self.emit(Event::Immune { side: target });
                return false;
            }
        }
        if !self.accuracy_check(side, target, move_data) {
            self.emit(Event::Miss { side });
            return false;
        }
        true
    }

    fn accuracy_check(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        let Some(accuracy) = move_data.accuracy else {
            return true;
        };
        let stage =
            self.active(side).boosts.accuracy.clamp(-6, 6) - self.active(target).boosts.evasion;
        let accuracy = apply_accuracy_stage(u32::from(accuracy), stage.clamp(-6, 6));
        self.state.prng.chance(accuracy, 100)
    }

    /// Showdown's `hitStepMoveHitLoop`: every hit, then recoil and `onAfterMoveSecondarySelf`.
    fn hit_loop(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let hits = self.roll_hits(move_data);
        let mut landed = 0;
        let mut total_damage = 0;
        for _ in 0..hits {
            if self.active(target).is_fainted() || self.active(side).is_fainted() {
                break;
            }
            landed += 1;
            let dealt = self.hit(side, target, move_data);
            total_damage += dealt;
            self.move_effects(side, target, move_data);
            if dealt > 0 {
                self.damaging_hit(side, target, move_data);
            }
            self.update();
        }
        if move_data.multihit.max > 1 {
            self.emit(Event::HitCount { hits: landed });
        }
        if total_damage == 0 {
            return;
        }
        let max_hp = u32::from(self.active(side).max_hp());
        let recoil = if move_data.struggle_recoil {
            Some((max_hp + 2) / 4)
        } else {
            move_data
                .recoil
                .map(|fraction| fraction.of_rounded(total_damage))
        };
        if let Some(recoil) = recoil {
            self.damage(side, recoil.max(1), DamageSource::Recoil);
        }
        // Showdown runs an `Update` after recoil, before `onAfterMoveSecondarySelf`.
        self.update();
        if !self.mask(side).intersects(HandlerMask::AFTER_MOVE) {
            return;
        }
        for (effect, handler) in self.handlers(side) {
            if let Handler::AfterMoveRecoil(fraction) = *handler {
                if self.active(side).is_fainted() {
                    break;
                }
                let amount = fraction.of_floored(max_hp).max(1);
                self.damage(side, amount, DamageSource::Effect(effect));
            }
        }
    }

    /// Per hit, after damage: primary effects (including `heal` and `weather`), then `self`
    /// (one roll), then each secondary (one roll each), in Showdown's order.
    fn move_effects(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        self.apply_effect(target, move_data.primary);
        if let Some(fraction) = move_data.heal {
            let max_hp = u32::from(self.active(target).max_hp());
            self.heal(target, fraction.of_rounded(max_hp), HealSource::Move);
        }
        if let Some(weather) = move_data.weather {
            self.set_weather(weather);
        }
        if let Some(boosts) = move_data.self_boosts {
            self.state.prng.below(100);
            self.boost(side, boosts);
        }
        self.secondaries(side, target, move_data);
    }

    fn secondaries(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        let mut applied = false;
        for secondary in &move_data.secondaries {
            let roll = self.state.prng.below(100);
            if secondary
                .chance
                .is_none_or(|chance| roll < u32::from(chance))
            {
                applied |= self.apply_effect(target, secondary.effect);
                if let Some(boosts) = secondary.self_boosts {
                    applied |= self.boost(side, boosts);
                }
            }
        }
        applied
    }

    /// Showdown's `DamagingHit` event: the target's contact handlers, then thawing.
    fn damaging_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        if move_data.flags.contact && self.mask(target).intersects(HandlerMask::DAMAGING_HIT) {
            let max_hp = u32::from(self.active(side).max_hp());
            for (effect, handler) in self.handlers(target) {
                if let Handler::ContactDamage(fraction) = *handler
                    && !self.active(side).is_fainted()
                {
                    self.damage(
                        side,
                        fraction.of_floored(max_hp).max(1),
                        DamageSource::Effect(effect),
                    );
                }
            }
            for (effect, handler) in self.handlers(target) {
                if let Handler::ContactStatus { chance, status } = *handler {
                    let triggered =
                        chance.is_none_or(|chance| self.state.prng.chance(u32::from(chance), 100));
                    if triggered && self.can_set_status(side, status) {
                        self.announce(target, effect);
                        self.set_status(side, status);
                    }
                }
            }
        }
        let thaws = move_data
            .move_type
            .is_some_and(|move_type| self.dex.type_data(move_type).thaws_frozen_targets);
        if thaws && self.active(target).status == Some(Status::Freeze) {
            self.cure_status(target);
        }
    }

    fn roll_hits(&mut self, move_data: &MoveData) -> u8 {
        let range = move_data.multihit;
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
        let crit_ratio = usize::from(move_data.crit_ratio).min(CRIT_DENOMINATORS.len() - 1);
        let critical = crit_ratio > 0 && self.state.prng.chance(1, CRIT_DENOMINATORS[crit_ratio]);
        let type_modifier = self.type_modifier(move_data, target).unwrap_or(0);
        let damage = self.move_damage(side, target, move_data, critical, type_modifier);
        match type_modifier.cmp(&0) {
            Ordering::Greater => self.emit(Event::SuperEffective { side: target }),
            Ordering::Less => self.emit(Event::Resisted { side: target }),
            Ordering::Equal => {}
        }
        if critical {
            self.emit(Event::Crit { side: target });
        }
        let dealt = self.damage(target, damage, DamageSource::Move);
        if let Some(drain) = move_data.drain
            && dealt > 0
        {
            self.heal(side, drain.of_rounded(dealt), HealSource::Drain);
        }
        dealt
    }

    /// A status move's effects: primary on the target, weather, healing, `self`, then
    /// secondaries. Fails if nothing changed.
    fn status_move_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let mut applied = self.apply_effect(target, move_data.primary);
        if let Some(fraction) = move_data.heal {
            let max_hp = u32::from(self.active(target).max_hp());
            applied |= self.heal(target, fraction.of_rounded(max_hp), HealSource::Move) > 0;
        }
        if let Some(weather) = move_data.weather {
            applied |= self.set_weather(weather);
        }
        if let Some(boosts) = move_data.self_boosts {
            self.state.prng.below(100);
            applied |= self.boost(side, boosts);
        }
        applied |= self.secondaries(side, target, move_data);
        if !applied {
            self.emit(Event::Fail { side });
        }
    }

    /// Applies boosts, a status, and a volatile status to `recipient`. Returns whether anything
    /// changed.
    fn apply_effect(&mut self, recipient: SideId, effect: MoveEffect) -> bool {
        if self.active(recipient).is_fainted() {
            return false;
        }
        let mut applied = effect
            .boosts
            .is_some_and(|boosts| self.boost(recipient, boosts));
        if let Some(status) = effect.status {
            applied |= self.set_status(recipient, status);
        }
        match effect.volatile_status {
            Some(VolatileStatus::Confusion)
                if self.active(recipient).volatiles.confusion.is_none() =>
            {
                let time = u8::try_from(self.state.prng.range(2, 6)).unwrap_or(2);
                self.active_mut(recipient).volatiles.confusion = Some(time);
                self.emit(Event::Start {
                    side: recipient,
                    volatile: VolatileStatus::Confusion,
                });
                applied = true;
            }
            Some(VolatileStatus::Flinch) => {
                self.active_mut(recipient).volatiles.flinch = true;
                applied = true;
            }
            _ => {}
        }
        applied
    }

    fn can_set_status(&self, side: SideId, status: Status) -> bool {
        let pokemon = self.active(side);
        if pokemon.is_fainted() || pokemon.status.is_some() {
            return false;
        }
        let type_immune = pokemon.types().any(|type_id| {
            self.dex
                .type_data(type_id)
                .status_immunities
                .contains(&status)
        });
        let handler_immune = self.mask(side).intersects(HandlerMask::STATUS_IMMUNITY)
            && self
                .handlers(side)
                .any(|(_, handler)| *handler == Handler::StatusImmunity(status));
        let prevented = self
            .weather()
            .is_some_and(|weather| weather.prevents_statuses.contains(&status));
        !(type_immune || handler_immune || prevented)
    }

    /// Showdown's `setStatus`; a `cureStatus` item reacts immediately, like Lum Berry's
    /// `onAfterSetStatus`.
    pub(super) fn set_status(&mut self, side: SideId, status: Status) -> bool {
        if !self.can_set_status(side, status) {
            return false;
        }
        let time = if status == Status::Sleep {
            u8::try_from(self.state.prng.range(2, 5)).unwrap_or(2)
        } else {
            0
        };
        let pokemon = self.active_mut(side);
        pokemon.status = Some(status);
        pokemon.status_state.time = time;
        pokemon.status_state.stage = 0;
        self.emit(Event::Status { side, status });
        if self.mask(side).intersects(HandlerMask::UPDATE) {
            let cure: Option<Effect> = self
                .handlers(side)
                .find_map(|(effect, handler)| (*handler == Handler::CureStatus).then_some(effect));
            if let Some(effect) = cure {
                self.cure(side, effect);
            }
        }
        true
    }
}
