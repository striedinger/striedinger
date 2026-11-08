//! Using a move: pre-move checks, the hit steps, damage, and effects.

use std::cmp::Ordering;

use super::Engine;
use crate::battle::events::{CantMoveReason, DamageCause, Event, HealCause, TraitRef};
use crate::battle::state::{SideId, StatusCondition};
use crate::dex::{
    EffectKind, EffectTarget, MoveData, MoveEffect, MoveTarget, Recoil, StatusKind, TraitEffect,
};
use crate::stats::{BoostStat, apply_accuracy_stage};

/// Gen 5+ odds for moves that hit two to five times: 35%, 35%, 15%, 15%.
const TWO_TO_FIVE_HITS: [u8; 20] = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5];
/// Gen 7+ critical-hit odds are one in each denominator, by stage.
const CRIT_DENOMINATORS: [u32; 4] = [24, 8, 2, 1];

impl Engine<'_> {
    pub(super) fn use_move(&mut self, side: SideId, slot: Option<usize>) {
        if !self.can_move(side) {
            return;
        }
        let dex = self.dex;
        let locks = self
            .active(side)
            .has_trait_effect(dex, |effect| *effect == TraitEffect::ChoiceLock);
        let user = self.active_mut(side);
        let move_id = match slot {
            Some(slot) => {
                let Some(move_slot) = user.moves[slot].as_mut() else {
                    return;
                };
                move_slot.pp = move_slot.pp.saturating_sub(1);
                let id = move_slot.id;
                if locks && user.volatiles.choice_locked_slot.is_none() {
                    user.volatiles.choice_locked_slot = u8::try_from(slot).ok();
                }
                id
            }
            None => dex.struggle(),
        };
        self.emit(Event::MoveUsed { side, move_id });
        let move_data = dex.move_data(move_id);
        let target = match move_data.target {
            MoveTarget::User => side,
            MoveTarget::Opponent => side.opponent(),
        };
        if move_data.target == MoveTarget::Opponent && !self.try_hit(side, target, move_data) {
            return;
        }
        if move_data.is_damaging() {
            self.use_damaging_move(side, target, move_data);
        } else {
            self.use_status_move(side, target, move_data);
        }
    }

    /// Runs the hit steps before damage: a target exists, absorbing traits, type immunity,
    /// then accuracy. Returns whether the move goes on to hit.
    fn try_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        if self.active(target).is_fainted() {
            self.emit(Event::Failed { side });
            return false;
        }
        if let Some(move_type) = move_data.move_type {
            let absorb = self
                .trait_effects(target)
                .find_map(|(source, effect)| match *effect {
                    TraitEffect::AbsorbType {
                        move_type: absorbed,
                        heal,
                        boost,
                    } if absorbed == move_type => Some((source, heal, boost)),
                    _ => None,
                });
            if let Some((source, heal, boost)) = absorb {
                self.emit(Event::TraitActivated {
                    side: target,
                    source,
                });
                let max_hp = u32::from(self.active(target).max_hp());
                let healed = heal.is_some_and(|fraction| {
                    self.heal(
                        target,
                        fraction.of_floored(max_hp),
                        HealCause::Trait(source),
                    ) > 0
                });
                let boosted = boost.is_some_and(|(stat, stages)| self.boost(target, stat, stages));
                if !healed && !boosted {
                    self.emit(Event::Immune { side: target });
                }
                return false;
            }
        }
        if move_data.is_damaging() || move_data.respects_type_immunity {
            let immunity = move_data.move_type.and_then(|move_type| {
                self.trait_effects(target).find_map(|(source, effect)| {
                    (*effect == TraitEffect::TypeImmunity(move_type)).then_some(source)
                })
            });
            if let Some(source) = immunity {
                self.emit(Event::TraitActivated {
                    side: target,
                    source,
                });
                self.emit(Event::Immune { side: target });
                return false;
            }
            if self.type_modifier(move_data, target).is_none() {
                self.emit(Event::Immune { side: target });
                return false;
            }
        }
        if !self.accuracy_check(side, target, move_data) {
            self.emit(Event::Missed { side });
            return false;
        }
        true
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

    fn accuracy_check(&mut self, side: SideId, target: SideId, move_data: &MoveData) -> bool {
        let Some(accuracy) = move_data.accuracy else {
            return true;
        };
        let stage = self
            .active(side)
            .boosts
            .get(BoostStat::Accuracy)
            .clamp(-6, 6)
            - self.active(target).boosts.get(BoostStat::Evasion);
        let accuracy = apply_accuracy_stage(u32::from(accuracy), stage.clamp(-6, 6));
        self.state.prng.chance(accuracy, 100)
    }

    /// Runs every hit, then recoil and after-attack traits.
    ///
    /// Per hit, effects follow Showdown: unconditional effects on the user share one roll and
    /// apply first, then every other effect rolls its own chance in listed order, then
    /// contact traits and thawing react to the hit.
    fn use_damaging_move(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
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
            self.apply_damaging_effects(side, target, move_data);
            if dealt > 0 {
                self.after_damaging_hit(side, target, move_data);
            }
            self.update();
        }
        if move_data.hits.max > 1 {
            self.emit(Event::HitCount { hits: landed });
        }
        if total_damage == 0 {
            return;
        }
        let max_hp = u32::from(self.active(side).max_hp());
        let recoil = match move_data.recoil {
            Some(Recoil::DamageDealt(fraction)) => Some(fraction.of_rounded(total_damage)),
            Some(Recoil::MaxHp(fraction)) => Some(fraction.of_rounded(max_hp)),
            None => None,
        };
        if let Some(recoil) = recoil {
            self.damage(side, recoil.max(1), DamageCause::Recoil);
        }
        let after_attack = self
            .trait_effects(side)
            .filter_map(|(source, effect)| match *effect {
                TraitEffect::RecoilAfterAttack(fraction) => Some((source, fraction)),
                _ => None,
            });
        for (source, fraction) in after_attack {
            if self.active(side).is_fainted() {
                break;
            }
            self.emit(Event::TraitActivated { side, source });
            let amount = fraction.of_floored(max_hp).max(1);
            self.damage(side, amount, DamageCause::Trait(source));
        }
    }

    fn apply_damaging_effects(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let is_self_drop =
            |effect: &MoveEffect| effect.target == EffectTarget::User && effect.chance.is_none();
        if move_data.effects.iter().any(is_self_drop) {
            self.state.prng.below(100);
            for effect in move_data
                .effects
                .iter()
                .filter(|effect| is_self_drop(effect))
            {
                self.apply_effect(side, effect.kind);
            }
        }
        for effect in move_data
            .effects
            .iter()
            .filter(|effect| !is_self_drop(effect))
        {
            let roll = self.state.prng.below(100);
            if effect.chance.is_none_or(|chance| roll < u32::from(chance)) {
                let recipient = match effect.target {
                    EffectTarget::User => side,
                    EffectTarget::Target => target,
                };
                self.apply_effect(recipient, effect.kind);
            }
        }
    }

    /// Reactions to a damaging hit: the target's contact traits, then thawing.
    fn after_damaging_hit(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        if move_data.contact {
            let max_hp = u32::from(self.active(side).max_hp());
            for (source, effect) in self.trait_effects(target) {
                if let TraitEffect::ContactDamage(fraction) = *effect
                    && !self.active(side).is_fainted()
                {
                    self.emit(Event::TraitActivated {
                        side: target,
                        source,
                    });
                    self.damage(
                        side,
                        fraction.of_floored(max_hp).max(1),
                        DamageCause::Trait(source),
                    );
                }
            }
            for (source, effect) in self.trait_effects(target) {
                if let TraitEffect::ContactStatus { chance, status } = *effect {
                    let triggered =
                        chance.is_none_or(|chance| self.state.prng.chance(u32::from(chance), 100));
                    if triggered && self.can_receive_status(side, status) {
                        self.emit(Event::TraitActivated {
                            side: target,
                            source,
                        });
                        self.inflict_status(side, status);
                    }
                }
            }
        }
        let thaws = move_data
            .move_type
            .is_some_and(|move_type| self.dex.type_data(move_type).thaws_frozen_targets);
        if thaws && self.active(target).status == Some(StatusCondition::Freeze) {
            self.cure_status(target);
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
        match type_modifier.cmp(&0) {
            Ordering::Greater => self.emit(Event::SuperEffective { side: target }),
            Ordering::Less => self.emit(Event::NotVeryEffective { side: target }),
            Ordering::Equal => {}
        }
        if critical {
            self.emit(Event::CriticalHit { side: target });
        }
        let dealt = self.damage(target, damage, DamageCause::Move);
        if let Some(drain) = move_data.drain
            && dealt > 0
        {
            self.heal(side, drain.of_rounded(dealt), HealCause::Drain);
        }
        dealt
    }

    fn use_status_move(&mut self, side: SideId, target: SideId, move_data: &MoveData) {
        let mut any_applied = false;
        for effect in &move_data.effects {
            let applies = effect
                .chance
                .is_none_or(|chance| self.state.prng.below(100) < u32::from(chance));
            if applies {
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

    /// Applies an effect and returns whether it changed anything.
    fn apply_effect(&mut self, recipient: SideId, kind: EffectKind) -> bool {
        if self.active(recipient).is_fainted() {
            return false;
        }
        match kind {
            EffectKind::Boost { stat, stages } => self.boost(recipient, stat, stages),
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
            EffectKind::Weather(id) => self.set_weather(id),
            EffectKind::Heal(fraction) => {
                let max_hp = u32::from(self.active(recipient).max_hp());
                self.heal(recipient, fraction.of_rounded(max_hp), HealCause::Move) > 0
            }
        }
    }

    fn can_receive_status(&self, side: SideId, status: StatusKind) -> bool {
        let pokemon = self.active(side);
        if pokemon.is_fainted() || pokemon.status.is_some() {
            return false;
        }
        let group = status.immunity_group();
        let type_immune = pokemon.types().any(|type_id| {
            self.dex
                .type_data(type_id)
                .status_immunities
                .contains(&group)
        });
        let trait_immune = self
            .trait_effects(side)
            .any(|(_, effect)| *effect == TraitEffect::StatusImmunity(group));
        let prevented = self
            .weather()
            .is_some_and(|weather| weather.prevents_statuses.contains(&status));
        !(type_immune || trait_immune || prevented)
    }

    pub(super) fn inflict_status(&mut self, side: SideId, status: StatusKind) -> bool {
        if !self.can_receive_status(side, status) {
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
        let cure: Option<TraitRef> = self
            .trait_effects(side)
            .find_map(|(source, effect)| (*effect == TraitEffect::CureStatus).then_some(source));
        if let Some(source) = cure {
            self.trigger_cure(side, source);
        }
        true
    }
}
