//! Stats, speed, and damage with ability and item modifiers, chained in 4096 fixed point like
//! Showdown's `chainModify`. Each lookup first checks the holder's handler mask, so creatures
//! without a relevant handler skip the work entirely.

use super::Engine;
use crate::battle::damage::{DAMAGE_ROLLS, DamageInput, STAB_MODIFIER, calculate_damage};
use crate::battle::state::{Pokemon, SideId};
use crate::dex::{Condition, Handler, HandlerMask, MoveCategory, MoveData, Status};
use crate::stats::{BoostStat, MODIFIER_SCALE, Stat, apply_modifier, apply_stage, chain_modifiers};

/// Speed is capped here before ordering.
const MAX_SPEED: u32 = 10_000;
/// Action order compares speed in 13 bits, as Showdown's `getActionSpeed` does.
const ACTION_SPEED_BITS: u32 = 13;
/// Base power of a confusion self-hit.
const CONFUSION_POWER: u16 = 40;

/// What a modifier condition is evaluated against.
#[derive(Clone, Copy)]
struct Context<'m> {
    move_data: Option<&'m MoveData>,
    type_modifier: i8,
}

impl Context<'_> {
    const NO_MOVE: Self = Context {
        move_data: None,
        type_modifier: 0,
    };
}

impl Engine<'_> {
    fn condition_holds(
        &self,
        condition: Condition,
        holder: &Pokemon,
        context: Context<'_>,
    ) -> bool {
        match condition {
            Condition::MoveType(type_id) => context
                .move_data
                .is_some_and(|data| data.move_type == Some(type_id)),
            Condition::Category(category) => context
                .move_data
                .is_some_and(|data| data.category == category),
            Condition::HpAtMost(fraction) => fraction.covers(holder.hp, holder.max_hp()),
            Condition::FullHp => holder.hp == holder.max_hp(),
            Condition::Statused => holder.status.is_some(),
            Condition::Weather(weather) => self.weather_id() == Some(weather),
            Condition::SuperEffective => context.type_modifier > 0,
        }
    }

    /// Chains every modifier `select` picks from the holder's handlers, skipping the walk
    /// entirely when the holder has no handler of `kind`.
    fn chained(
        &self,
        side: SideId,
        kind: HandlerMask,
        context: Context<'_>,
        select: impl Fn(&Handler) -> Option<(u32, &[Condition])>,
    ) -> u32 {
        if !self.mask(side).intersects(kind) {
            return MODIFIER_SCALE;
        }
        let holder = self.active(side);
        chain_modifiers(self.handlers(side).filter_map(|(_, handler)| {
            let (modifier, conditions) = select(handler)?;
            conditions
                .iter()
                .all(|&condition| self.condition_holds(condition, holder, context))
                .then_some(modifier)
        }))
    }

    /// A stat after its stage, any weather boost (applied first, as Showdown's sandstorm and
    /// snow handlers are), and `modifyStat` handlers.
    fn modified_stat(&self, side: SideId, stat: Stat, stage: i8, context: Context<'_>) -> u32 {
        let pokemon = self.active(side);
        let mut value = apply_stage(pokemon.stats.get(stat), stage);
        if matches!(stat, Stat::Defense | Stat::SpecialDefense)
            && let Some(weather) = self.weather()
        {
            for boost in &weather.defense_boosts {
                if boost.stat == stat && pokemon.has_type(boost.type_id) {
                    value = apply_modifier(value, boost.modifier);
                }
            }
        }
        let kind = if stat == Stat::Speed {
            HandlerMask::MODIFY_SPEED
        } else {
            HandlerMask::MODIFY_STAT
        };
        let modifier = self.chained(side, kind, context, |handler| match handler {
            Handler::ModifyStat {
                stat: modified,
                modifier,
                conditions,
            } if *modified == stat => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        apply_modifier(value, modifier)
    }

    /// Showdown's `getActionSpeed`: the speed used to order actions and end-of-turn effects.
    pub(super) fn action_speed(&self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let stage = pokemon.boosts.get(BoostStat::Speed);
        let mut speed = self.modified_stat(side, Stat::Speed, stage, Context::NO_MOVE);
        if pokemon.status == Some(Status::Paralysis) {
            speed /= 2;
        }
        speed.min(MAX_SPEED) % (1 << ACTION_SPEED_BITS)
    }

    pub(super) fn type_modifier(&self, move_data: &MoveData, target: SideId) -> Option<i8> {
        match move_data.move_type {
            Some(move_type) => self
                .dex
                .type_modifier(move_type, self.active(target).types()),
            None => Some(0),
        }
    }

    /// Rolls and returns the damage of one hit.
    pub(super) fn move_damage(
        &mut self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        critical: bool,
        type_modifier: i8,
    ) -> u32 {
        let input = self.damage_input(side, target, move_data, critical, type_modifier);
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }

    /// Showdown's `getDamage` and `modifyDamage`, short of the random roll.
    fn damage_input(
        &self,
        side: SideId,
        target: SideId,
        move_data: &MoveData,
        critical: bool,
        type_modifier: i8,
    ) -> DamageInput {
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
        let context = Context {
            move_data: Some(move_data),
            type_modifier,
        };
        let base_power_modifier =
            self.chained(
                side,
                HandlerMask::BASE_POWER,
                context,
                |handler| match handler {
                    Handler::BasePower {
                        modifier,
                        conditions,
                    } => Some((*modifier, conditions.as_slice())),
                    _ => None,
                },
            );
        let base_power =
            apply_modifier(u32::from(move_data.base_power), base_power_modifier).max(1);
        let ignores_burn = self.mask(side).intersects(HandlerMask::ATTACK_RULES)
            && self
                .handlers(side)
                .any(|(_, handler)| *handler == Handler::IgnoreBurnPenalty);
        DamageInput {
            level: attacker.level,
            power: u16::try_from(base_power).unwrap_or(u16::MAX),
            attack: self.modified_stat(side, attack_stat, attack_stage, context),
            defense: self.modified_stat(target, defense_stat, defense_stage, context),
            weather_modifier: self.weather().and_then(|weather| {
                weather
                    .damage_modifiers
                    .iter()
                    .find(|(type_id, _)| Some(*type_id) == move_data.move_type)
                    .map(|&(_, modifier)| modifier)
            }),
            critical,
            roll: 0,
            stab_modifier: self.stab_modifier(side, move_data),
            type_modifier,
            burned: move_data.category == MoveCategory::Physical
                && attacker.status == Some(Status::Burn)
                && !ignores_burn,
            final_modifier: self.final_damage_modifier(side, target, context, critical),
        }
    }

    /// The same-type attack bonus, or a `modifySTAB` handler's replacement for it.
    fn stab_modifier(&self, side: SideId, move_data: &MoveData) -> u32 {
        let attacker = self.active(side);
        if !move_data
            .move_type
            .is_some_and(|move_type| attacker.has_type(move_type))
        {
            return MODIFIER_SCALE;
        }
        if !self.mask(side).intersects(HandlerMask::ATTACK_RULES) {
            return STAB_MODIFIER;
        }
        self.handlers(side)
            .find_map(|(_, handler)| match handler {
                Handler::ModifyStab(modifier) => Some(*modifier),
                _ => None,
            })
            .unwrap_or(STAB_MODIFIER)
    }

    /// Showdown's `ModifyDamage` chain: the attacker's `modifyDamage` handlers, the
    /// defender's `sourceModifyDamage` handlers, then screens on the defender's side, which
    /// critical hits ignore.
    fn final_damage_modifier(
        &self,
        side: SideId,
        target: SideId,
        context: Context<'_>,
        critical: bool,
    ) -> u32 {
        let dealt = self.chained(
            side,
            HandlerMask::MODIFY_DAMAGE,
            context,
            |handler| match handler {
                Handler::ModifyDamage {
                    modifier,
                    conditions,
                } => Some((*modifier, conditions.as_slice())),
                _ => None,
            },
        );
        let taken = self.chained(
            target,
            HandlerMask::SOURCE_MODIFY_DAMAGE,
            context,
            |handler| match handler {
                Handler::SourceModifyDamage {
                    modifier,
                    conditions,
                } => Some((*modifier, conditions.as_slice())),
                _ => None,
            },
        );
        let category = context.move_data.map(|data| data.category);
        let screens = self
            .state
            .side(target)
            .conditions
            .iter()
            .filter_map(|condition| self.dex.side_condition(condition.id).screen)
            .filter(|screen| !critical && Some(screen.category) == category)
            .map(|screen| screen.modifier);
        chain_modifiers([dealt, taken].into_iter().chain(screens))
    }

    /// Showdown's `getConfusionDamage`: a 40-power typeless hit that ignores every modifier
    /// but stat stages.
    pub(super) fn confusion_damage(&mut self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let input = DamageInput::neutral(
            pokemon.level,
            CONFUSION_POWER,
            apply_stage(pokemon.stats.attack, pokemon.boosts.attack),
            apply_stage(pokemon.stats.defense, pokemon.boosts.defense),
        );
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }
}
