//! Using a move, following Showdown's `runMove`, the `hitStep` sequence, and `spreadMoveHit`.

use std::cmp::Ordering;

use super::Engine;
use crate::battle::events::{CantReason, DamageSource, Effect, Event, HealSource};
use crate::battle::state::MAX_MOVES;
use crate::battle::state::{LockedMove, SideConditionState, SideId, Stall};
use crate::dex::{
    CallsMove, Handler, HandlerMask, MoveData, MoveEffect, MoveId, MoveTarget, Recoil, Status,
    VolatileStatus,
};
use crate::stats::apply_accuracy_stage;

/// Gen 5+ odds for moves that hit two to five times: 35%, 35%, 15%, 15%.
const TWO_TO_FIVE_HITS: [u8; 20] = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5];
/// Gen 7+ critical-hit odds by `critRatio`: one in each denominator.
const CRIT_DENOMINATORS: [u32; 5] = [0, 24, 8, 2, 1];
/// The `stall` counter after a first success.
const STALL_COUNTER_START: u16 = 3;
/// The `stall` counter stops growing here.
const STALL_COUNTER_MAX: u16 = 729;
/// End-of-turn checks a `stall` counter survives.
const STALL_DURATION: u8 = 2;

/// End-of-turn checks a `lockedmove` lasts between uses.
const LOCKED_MOVE_DURATION: u8 = 2;
/// Showdown's `twoturnmove` lasts through the end of the turn after the charge.
const TWO_TURN_MOVE_DURATION: u8 = 2;

/// What a damaging move's hits did.
struct HitOutcome {
    /// Whether any hit landed, on the target or its substitute.
    worked: bool,
    /// Whether any hit reached the target itself.
    reached_target: bool,
}

/// Where a hit's damage went.
enum Hit {
    /// The target took this much.
    Target(u32),
    /// The target's substitute absorbed this much.
    Substitute(u32),
}

impl Engine<'_> {
    /// Showdown's `runMove`: pre-move checks, PP, the move itself, then what follows it.
    /// Returns the side to drag out when a `forceSwitch` move worked.
    pub(super) fn run_move(
        &mut self,
        side: SideId,
        slot: Option<usize>,
        foe_will_act: bool,
    ) -> Option<SideId> {
        let dex = self.dex;
        let user = self.active(side);
        // A rampage or a charged move continues without spending PP.
        let forced = user.forced_move();
        let move_id = forced
            .or_else(|| slot.and_then(|slot| user.move_slots[slot].map(|move_slot| move_slot.id)))
            .unwrap_or_else(|| dex.struggle());
        if !self.before_move(side, move_id) {
            // Showdown's `onMoveAborted`: a charge is lost; a rampage carries on.
            let volatiles = &mut self.active_mut(side).volatiles;
            volatiles.charging = None;
            volatiles.two_turn_move = 0;
            return None;
        }
        if forced.is_none()
            && let Some(slot) = slot
        {
            let locks = self.mask(side).intersects(HandlerMask::CHOICE_LOCK);
            let user = self.active_mut(side);
            if let Some(move_slot) = user.move_slots[slot].as_mut() {
                move_slot.pp = move_slot.pp.saturating_sub(1);
            }
            if locks && user.volatiles.choice_lock.is_none() {
                user.volatiles.choice_lock = u8::try_from(slot).ok();
            }
        }
        let priority = dex.move_data(move_id).priority;
        let drag = self.use_move(side, move_id, priority, foe_will_act);
        self.after_move_lock(side);
        drag
    }

    /// Showdown's `useMove`: the move itself, without the checks and PP of choosing it, which
    /// a calling move like Metronome also uses. A called move takes its caller's `priority`.
    /// Returns the side to drag out when a `forceSwitch` move worked.
    fn use_move(
        &mut self,
        side: SideId,
        move_id: MoveId,
        priority: i8,
        foe_will_act: bool,
    ) -> Option<SideId> {
        let dex = self.dex;
        self.emit(Event::Move { side, move_id });
        self.active_move = Some(move_id);
        self.stellar_boosted = false;
        let move_data = dex.move_data(move_id);
        if self.charge_turn(side, move_data) {
            return None;
        }
        if let Some(calls) = move_data.calls {
            return match self.called_move(side, calls) {
                Some(called) => self.use_move(side, called, priority, foe_will_act),
                None => None,
            };
        }
        let (worked, reached_target, target) = match move_data.target {
            MoveTarget::FoeSide => (
                self.side_condition_move(side.foe(), move_data),
                false,
                side.foe(),
            ),
            MoveTarget::AllySide => (self.side_condition_move(side, move_data), false, side),
            MoveTarget::User | MoveTarget::Normal => {
                if move_data.stalling_move && !self.try_stall(side, foe_will_act) {
                    self.emit(Event::Fail { side });
                    return None;
                }
                let target = if move_data.target == MoveTarget::User {
                    side
                } else {
                    side.foe()
                };
                if move_data.target == MoveTarget::Normal
                    && !self.try_hit(side, target, move_data, priority)
                {
                    (false, false, target)
                } else if move_data.is_damaging() {
                    let outcome = self.hit_loop(side, target, move_data);
                    (outcome.worked, outcome.reached_target, target)
                } else {
                    let worked = self.status_move_hit(side, target, move_data);
                    (worked, worked, target)
                }
            }
        };
        if worked && move_data.stalling_move {
            self.restart_stall(side);
        }
        if worked
            && move_data.self_switch
            && self.state.outcome.is_none()
            && !self.active(side).is_fainted()
            && self.state.side(side).switches().next().is_some()
        {
            self.state.sides[side.index()].switch_flag = true;
        }
        let drags = worked
            && reached_target
            && move_data.force_switch
            && target != side
            && !self.active(target).is_fainted()
            && self.state.side(target).drag_candidates().next().is_some();
        drags.then_some(target)
    }

    /// The move a calling move uses, or `None` after it fails. Picks at random with one roll,
    /// as Showdown's `sample` does.
    fn called_move(&mut self, side: SideId, calls: CallsMove) -> Option<MoveId> {
        let dex = self.dex;
        let pick = |engine: &mut Self, count: usize| {
            let count = u32::try_from(count).ok().filter(|&count| count > 0)?;
            usize::try_from(engine.state.prng.below(count)).ok()
        };
        let called = match calls {
            // Showdown sorts the pool by move number; pkmn's IDs are in the same order.
            CallsMove::Random => {
                let pool = || {
                    dex.all_moves()
                        .filter(|move_data| move_data.flags.metronome)
                };
                let index = pick(self, pool().count());
                index
                    .and_then(|index| pool().nth(index))
                    .map(|move_data| move_data.id)
            }
            CallsMove::OwnMove => {
                if self.active(side).status != Some(Status::Sleep) {
                    self.emit(Event::Fail { side });
                    return None;
                }
                let mut pool = [None; MAX_MOVES];
                let callable = self
                    .active(side)
                    .moves()
                    .map(|(_, move_slot)| move_slot.id)
                    .filter(|&id| {
                        let flags = dex.move_data(id).flags;
                        !flags.nosleeptalk && !flags.charge
                    });
                for (entry, id) in pool.iter_mut().zip(callable) {
                    *entry = Some(id);
                }
                let count = pool.iter().flatten().count();
                pick(self, count).and_then(|index| pool[index])
            }
            CallsMove::LastMove => match self.state.last_move {
                // With nothing to copy, Copycat does nothing, without failing.
                None => return None,
                Some(last) if dex.move_data(last).flags.failcopycat => None,
                Some(last) => Some(last),
            },
        };
        if called.is_none() {
            self.emit(Event::Fail { side });
        }
        called
    }

    /// Showdown's `onTryMove` for `charge` moves: the first use only charges, unless the weather
    /// skips the charge. Returns whether the move spent this turn charging.
    fn charge_turn(&mut self, side: SideId, move_data: &MoveData) -> bool {
        let Some(charge) = &move_data.charge else {
            return false;
        };
        if self.active_mut(side).volatiles.charging.take().is_some()
            || self
                .weather_id()
                .is_some_and(|weather| charge.skipped_in.contains(&weather))
        {
            return false;
        }
        let volatiles = &mut self.active_mut(side).volatiles;
        volatiles.charging = Some(move_data.id);
        volatiles.two_turn_move = TWO_TURN_MOVE_DURATION;
        self.emit(Event::Prepare {
            side,
            move_id: move_data.id,
        });
        if let Some(boosts) = charge.boosts {
            self.boost(side, boosts);
        }
        true
    }

    /// Starts or refreshes a rampage, as Showdown's `lockedmove` `onStart` and `onRestart` do.
    fn lock_into_move(&mut self, side: SideId, move_id: MoveId) {
        match self.active(side).volatiles.locked_move {
            None => {
                let true_duration = u8::try_from(self.state.prng.range(2, 4)).unwrap_or(2);
                self.active_mut(side).volatiles.locked_move = Some(LockedMove {
                    move_id,
                    true_duration,
                    duration: LOCKED_MOVE_DURATION,
                });
            }
            Some(mut locked) => {
                if locked.true_duration >= 2 {
                    locked.duration = LOCKED_MOVE_DURATION;
                }
                self.active_mut(side).volatiles.locked_move = Some(locked);
            }
        }
    }

    /// Showdown's `lockedmove` `onAfterMove`: the rampage ends after its last turn's move.
    fn after_move_lock(&mut self, side: SideId) {
        if self
            .active(side)
            .volatiles
            .locked_move
            .is_some_and(|locked| locked.duration == 1)
        {
            self.end_lock(side);
        }
    }

    /// Showdown's `lockedmove` `onEnd`: a rampage that ran its course leaves the user confused.
    pub(super) fn end_lock(&mut self, side: SideId) {
        let Some(locked) = self.active_mut(side).volatiles.locked_move.take() else {
            return;
        };
        if locked.true_duration <= 1 {
            self.apply_effect(
                side,
                MoveEffect {
                    volatile_status: Some(VolatileStatus::Confusion),
                    ..MoveEffect::default()
                },
            );
        }
    }

    /// Removes the side conditions and terrain a move clears, like Rapid Spin and Defog.
    /// Returns whether anything was removed.
    fn clear_conditions(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        let clears = &move_data.clears;
        let mut removed = false;
        for (holder, conditions) in [(side, &clears.user), (target, &clears.target)] {
            for &condition in conditions {
                let list = &mut self.state.sides[holder.index()].conditions;
                if let Some(index) = list.iter().position(|state| state.id == condition) {
                    list.remove(index);
                    self.emit(Event::SideEnd {
                        side: holder,
                        condition,
                    });
                    removed = true;
                }
            }
        }
        if clears.terrain {
            removed |= self.clear_terrain();
        }
        removed
    }

    /// Showdown's `onPrepareHit` for stalling moves: they fail if the foe has already acted
    /// this turn, and after a recent success they succeed with chance `1 / counter`.
    fn try_stall(&mut self, side: SideId, foe_will_act: bool) -> bool {
        if !foe_will_act {
            return false;
        }
        let Some(stall) = self.active(side).volatiles.stall else {
            return true;
        };
        if self.state.prng.chance(1, u32::from(stall.counter)) {
            return true;
        }
        self.active_mut(side).volatiles.stall = None;
        false
    }

    /// Showdown's `stall` volatile: starts at 3, triples on each consecutive success up to
    /// 729, and lasts through the next turn.
    fn restart_stall(&mut self, side: SideId) {
        let volatiles = &mut self.active_mut(side).volatiles;
        let counter = volatiles.stall.map_or(STALL_COUNTER_START, |stall| {
            if stall.counter < STALL_COUNTER_MAX {
                stall.counter * 3
            } else {
                stall.counter
            }
        });
        volatiles.stall = Some(Stall {
            counter,
            duration: STALL_DURATION,
        });
    }

    /// Sets a side condition, or adds a layer to a stacking hazard. Fails if it is already at
    /// its limit.
    fn side_condition_move(&mut self, side: SideId, move_data: &MoveData) -> bool {
        let Some(id) = move_data.side_condition else {
            return false;
        };
        let data = self.dex.side_condition(id);
        let conditions = &mut self.state.sides[side.index()].conditions;
        match conditions.iter_mut().find(|condition| condition.id == id) {
            Some(condition) if condition.layers < data.max_layers() => condition.layers += 1,
            Some(_) => {
                self.emit(Event::Fail { side: side.foe() });
                return false;
            }
            None => conditions.push(SideConditionState {
                id,
                layers: 1,
                duration: data.duration,
            }),
        }
        self.emit(Event::SideStart {
            side,
            condition: id,
        });
        true
    }

    /// Showdown's `onBeforeMove` handlers in priority order: sleep and freeze, flinch,
    /// confusion, then paralysis.
    fn before_move(&mut self, side: SideId, move_id: MoveId) -> bool {
        let sleep_usable = self.dex.move_data(move_id).sleep_usable;
        match self.active(side).status {
            Some(Status::Sleep) => {
                let pokemon = self.active_mut(side);
                pokemon.status_state.time = pokemon.status_state.time.saturating_sub(1);
                if pokemon.status_state.time > 0 {
                    self.emit(Event::Cant {
                        side,
                        reason: CantReason::Sleep,
                    });
                    // Sleep Talk and the like go ahead, past the checks that follow.
                    if !sleep_usable {
                        return false;
                    }
                } else {
                    self.cure_status(side);
                }
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
        // Showdown's `choicelock`: a move other than the locked one, which a rampage, a charge,
        // or a calling move can force, fails.
        let user = self.active(side);
        let locked = user
            .volatiles
            .choice_lock
            .and_then(|slot| user.move_slots[usize::from(slot)])
            .map(|move_slot| move_slot.id);
        if locked.is_some_and(|locked| locked != move_id && move_id != self.dex.struggle()) {
            self.emit(Event::Move { side, move_id });
            self.emit(Event::Fail { side });
            return false;
        }
        true
    }

    /// Showdown's hit steps before damage: a target exists, `onTryHit` (absorbing abilities),
    /// type immunity, then accuracy. Returns whether the move goes on to hit.
    fn try_hit(
        &mut self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        priority: i8,
    ) -> bool {
        if self.active(target).is_fainted() {
            self.emit(Event::Fail { side });
            return false;
        }
        if self.is_semi_invulnerable(target) {
            self.emit(Event::Miss { side });
            return false;
        }
        if priority > 0
            && self
                .terrain_affecting(target, |terrain| terrain.blocks_priority)
                .is_some()
        {
            self.emit(Event::Fail { side });
            return false;
        }
        if move_data.flags.protect && self.active(target).volatiles.protect {
            self.emit(Event::Activate {
                side: target,
                volatile: VolatileStatus::Protect,
            });
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

    /// Showdown's `hitStepMoveHitLoop`: every hit with its effects and `onAfterHit`, then recoil
    /// and `onAfterMoveSecondarySelf`.
    /// Returns whether any hit landed, on the target or its substitute.
    fn hit_loop(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> HitOutcome {
        let hits = self.roll_hits(move_data);
        let mut landed = 0;
        let mut total_damage = 0;
        let mut hit_substitute = false;
        for _ in 0..hits {
            if self.active(target).is_fainted() || self.active(side).is_fainted() {
                break;
            }
            landed += 1;
            match self.hit(side, target, move_data) {
                Hit::Target(dealt) => {
                    total_damage += dealt;
                    self.move_effects(side, target, move_data, true);
                    if dealt > 0 {
                        self.damaging_hit(side, target, move_data);
                    }
                }
                Hit::Substitute(absorbed) => {
                    hit_substitute = true;
                    self.substitute_recoil(side, move_data, absorbed);
                    self.move_effects(side, target, move_data, false);
                }
            }
            // Showdown's `onAfterHit` and `onAfterSubDamage`, like Rapid Spin's: per hit, before
            // recoil and Life Orb, while the user stands.
            if !self.active(side).is_fainted() {
                self.clear_conditions(side, target, move_data);
            }
            self.update();
        }
        if move_data.multihit.max > 1 {
            self.emit(Event::HitCount { hits: landed });
        }
        let reached_target = total_damage > 0;
        if !reached_target && !hit_substitute {
            return HitOutcome {
                worked: false,
                reached_target,
            };
        }
        if total_damage > 0 {
            self.recoil(side, move_data, total_damage);
        }
        // Showdown runs an `Update` after recoil, before `onAfterMoveSecondarySelf`.
        self.update();
        self.after_move_recoil(side);
        HitOutcome {
            worked: true,
            reached_target,
        }
    }

    /// Recoil from damage dealt to a substitute, applied per hit as Showdown's substitute
    /// handler does.
    fn substitute_recoil(&mut self, side: SideId, move_data: &MoveData, absorbed: u32) {
        if absorbed > 0 {
            self.recoil(side, move_data, absorbed);
        }
    }

    fn recoil(&mut self, side: SideId, move_data: &MoveData, damage: u32) {
        let max_hp = u32::from(self.active(side).max_hp());
        let recoil = move_data.recoil.map(|recoil| match recoil {
            Recoil::Struggle => (max_hp + 2) / 4,
            Recoil::DamageDealt(fraction) => fraction.of_rounded(damage),
        });
        if let Some(recoil) = recoil {
            self.damage(side, recoil.max(1), DamageSource::Recoil);
        }
    }

    /// Showdown's `onAfterMoveSecondarySelf`, like Life Orb.
    fn after_move_recoil(&mut self, side: SideId) {
        let max_hp = u32::from(self.active(side).max_hp());
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
    /// (one roll), then each secondary (one roll each), in Showdown's order. A hit on a
    /// substitute skips the target's effects but still rolls and applies the user's.
    fn move_effects(
        &mut self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        reached_target: bool,
    ) {
        if reached_target {
            self.apply_effect(target, move_data.primary);
            if let Some(fraction) = move_data.heal {
                let max_hp = u32::from(self.active(target).max_hp());
                self.heal(target, fraction.of_rounded(max_hp), HealSource::Move);
            }
            if let Some(weather) = move_data.weather {
                self.set_weather(weather);
            }
        }
        if let Some(boosts) = move_data.self_boosts {
            self.state.prng.below(100);
            self.boost(side, boosts);
        }
        if move_data.self_volatile == Some(VolatileStatus::LockedMove) {
            self.lock_into_move(side, move_data.id);
        }
        self.secondaries(side, target, move_data, reached_target);
    }

    fn secondaries(
        &mut self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        reached_target: bool,
    ) -> bool {
        let mut applied = false;
        for secondary in &move_data.secondaries {
            let roll = self.state.prng.below(100);
            if secondary
                .chance
                .is_none_or(|chance| roll < u32::from(chance))
            {
                if reached_target {
                    applied |= self.apply_effect(target, secondary.effect);
                }
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
    fn hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> Hit {
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
        if let Some(substitute) = self.active(target).volatiles.substitute
            && !move_data.flags.bypasssub
        {
            let absorbed = damage.min(u32::from(substitute));
            let remaining = substitute.saturating_sub(u16::try_from(absorbed).unwrap_or(u16::MAX));
            self.active_mut(target).volatiles.substitute = (remaining > 0).then_some(remaining);
            self.emit(Event::Activate {
                side: target,
                volatile: VolatileStatus::Substitute,
            });
            if remaining == 0 {
                self.emit(Event::End {
                    side: target,
                    volatile: VolatileStatus::Substitute,
                });
            }
            // Showdown's substitute handler rounds drain up.
            if let Some(drain) = move_data.drain
                && absorbed > 0
            {
                let restored =
                    (absorbed * u32::from(drain.numerator)).div_ceil(u32::from(drain.denominator));
                self.heal(side, restored, HealSource::Drain);
            }
            return Hit::Substitute(absorbed);
        }
        let dealt = self.damage(target, damage, DamageSource::Move);
        if let Some(drain) = move_data.drain
            && dealt > 0
        {
            self.heal(side, drain.of_rounded(dealt), HealSource::Drain);
        }
        Hit::Target(dealt)
    }

    /// A status move's effects: primary on the target, weather, healing, `self`, then
    /// secondaries. Fails if nothing changed, or if a substitute stands in the way.
    fn status_move_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        if target != side
            && self.active(target).volatiles.substitute.is_some()
            && !move_data.flags.bypasssub
        {
            self.emit(Event::Fail { side });
            return false;
        }
        let mut primary = move_data.primary;
        if move_data.substitute_blocks_boosts
            && target != side
            && self.active(target).volatiles.substitute.is_some()
        {
            primary.boosts = None;
        }
        let mut applied = self.apply_effect(target, primary);
        if let Some(fraction) = move_data.heal {
            let max_hp = u32::from(self.active(target).max_hp());
            applied |= self.heal(target, fraction.of_rounded(max_hp), HealSource::Move) > 0;
        }
        if let Some(weather) = move_data.weather {
            applied |= self.set_weather(weather);
        }
        if let Some(terrain) = move_data.terrain {
            applied |= self.set_terrain(terrain);
        }
        applied |= self.clear_conditions(side, target, move_data);
        if move_data.force_switch {
            applied |= self.state.side(target).drag_candidates().next().is_some();
        }
        if let Some(boosts) = move_data.self_boosts {
            self.state.prng.below(100);
            applied |= self.boost(side, boosts);
        }
        applied |= self.secondaries(side, target, move_data, true);
        if !applied {
            self.emit(Event::Fail { side });
        }
        applied
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
                if self.active(recipient).volatiles.confusion.is_none()
                    && self
                        .terrain_affecting(recipient, |terrain| {
                            terrain
                                .prevents_volatiles
                                .contains(&VolatileStatus::Confusion)
                        })
                        .is_none() =>
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
            Some(VolatileStatus::Protect) => {
                self.active_mut(recipient).volatiles.protect = true;
                self.emit(Event::Start {
                    side: recipient,
                    volatile: VolatileStatus::Protect,
                });
                applied = true;
            }
            Some(VolatileStatus::Substitute) => applied |= self.make_substitute(recipient),
            Some(VolatileStatus::Confusion | VolatileStatus::LockedMove) | None => {}
        }
        applied
    }

    /// Showdown's Substitute: fails with a substitute already up, at 1/4 HP or less, or at 1
    /// max HP; otherwise pays 1/4 of max HP for a decoy with that much HP.
    fn make_substitute(&mut self, side: SideId) -> bool {
        let pokemon = self.active(side);
        let max_hp = pokemon.max_hp();
        if pokemon.volatiles.substitute.is_some()
            || u32::from(pokemon.hp) * 4 <= u32::from(max_hp)
            || max_hp == 1
        {
            return false;
        }
        let cost = (max_hp / 4).max(1);
        self.damage(side, u32::from(cost), DamageSource::Substitute);
        self.active_mut(side).volatiles.substitute = Some(cost);
        self.emit(Event::Start {
            side,
            volatile: VolatileStatus::Substitute,
        });
        true
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
            .is_some_and(|weather| weather.prevents_statuses.contains(&status))
            || self
                .terrain_affecting(side, |terrain| terrain.prevents_statuses.contains(&status))
                .is_some();
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
