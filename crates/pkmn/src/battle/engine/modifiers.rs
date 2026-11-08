//! Stats, speed, and damage with ability and item modifiers, chained in 4096 fixed point like
//! the games.

use super::Engine;
use crate::battle::damage::{DAMAGE_ROLLS, DamageInput, STAB_MODIFIER, calculate_damage};
use crate::battle::state::{Pokemon, SideId, StatusCondition};
use crate::dex::{Condition, MoveCategory, MoveData, TraitEffect};
use crate::stats::{BoostStat, MODIFIER_SCALE, Stat, apply_modifier, apply_stage};

/// Speed is capped here before ordering.
const MAX_SPEED: u32 = 10_000;
/// Action order compares speed in 13 bits, as Showdown does.
const ACTION_SPEED_BITS: u32 = 13;
/// Base power of a confusion self-hit.
const CONFUSION_POWER: u16 = 40;

/// Combines 4096-based modifiers, rounding each step like Showdown's `chainModify`.
fn chain(modifiers: impl IntoIterator<Item = u32>) -> u32 {
    modifiers.into_iter().fold(MODIFIER_SCALE, |total, next| {
        let product = u64::from(total) * u64::from(next) + u64::from(MODIFIER_SCALE / 2);
        u32::try_from(product >> 12).unwrap_or(u32::MAX)
    })
}

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
            Condition::HpAtMost(fraction) => {
                u32::from(holder.hp) * u32::from(fraction.denominator)
                    <= u32::from(holder.max_hp()) * u32::from(fraction.numerator)
            }
            Condition::FullHp => holder.hp == holder.max_hp(),
            Condition::Statused => holder.status.is_some(),
            Condition::Weather(weather) => self.weather_id() == Some(weather),
            Condition::SuperEffective => context.type_modifier > 0,
        }
    }

    /// Chains every modifier the holder's traits contribute through `select`.
    fn trait_modifier(
        &self,
        side: SideId,
        context: Context<'_>,
        select: impl Fn(&TraitEffect) -> Option<(u32, &[Condition])>,
    ) -> u32 {
        let holder = self.active(side);
        chain(self.trait_effects(side).filter_map(|(_, effect)| {
            let (modifier, conditions) = select(effect)?;
            conditions
                .iter()
                .all(|&condition| self.condition_holds(condition, holder, context))
                .then_some(modifier)
        }))
    }

    /// A stat after its stage, any weather boost, and trait modifiers.
    fn modified_stat(&self, side: SideId, stat: Stat, stage: i8, context: Context<'_>) -> u32 {
        let pokemon = self.active(side);
        let mut value = apply_stage(pokemon.stats.get(stat), stage);
        if let Some(weather) = self.weather() {
            for boost in &weather.defense_boosts {
                if boost.stat == stat && pokemon.has_type(boost.type_id) {
                    value = apply_modifier(value, boost.modifier);
                }
            }
        }
        let modifier = self.trait_modifier(side, context, |effect| match effect {
            TraitEffect::StatModifier {
                stat: modified,
                modifier,
                conditions,
            } if *modified == stat => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        apply_modifier(value, modifier)
    }

    /// The speed used to order actions and end-of-turn effects.
    pub(super) fn action_speed(&self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let stage = pokemon.boosts.get(BoostStat::Speed);
        let mut speed = self.modified_stat(side, Stat::Speed, stage, Context::NO_MOVE);
        if pokemon.status == Some(StatusCondition::Paralysis) {
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

    /// Everything about a hit except the random roll.
    pub(crate) fn damage_input(
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
        let power_modifier = self.trait_modifier(side, context, |effect| match effect {
            TraitEffect::PowerModifier {
                modifier,
                conditions,
            } => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        let power = apply_modifier(u32::from(move_data.power), power_modifier).max(1);
        let has_stab = move_data
            .move_type
            .is_some_and(|move_type| attacker.has_type(move_type));
        let stab_modifier = if has_stab {
            self.trait_effects(side)
                .find_map(|(_, effect)| match effect {
                    TraitEffect::StabModifier(modifier) => Some(*modifier),
                    _ => None,
                })
                .unwrap_or(STAB_MODIFIER)
        } else {
            MODIFIER_SCALE
        };
        let dealt = self.trait_modifier(side, context, |effect| match effect {
            TraitEffect::DamageDealtModifier {
                modifier,
                conditions,
            } => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        let taken = self.trait_modifier(target, context, |effect| match effect {
            TraitEffect::DamageTakenModifier {
                modifier,
                conditions,
            } => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        let ignores_burn =
            attacker.has_trait_effect(self.dex, |effect| *effect == TraitEffect::IgnoresBurn);
        DamageInput {
            level: attacker.level,
            power: u16::try_from(power).unwrap_or(u16::MAX),
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
            stab_modifier,
            type_modifier,
            burned: move_data.category == MoveCategory::Physical
                && attacker.status == Some(StatusCondition::Burn)
                && !ignores_burn,
            final_modifier: chain([dealt, taken]),
        }
    }

    /// Rolls the damage of a confusion self-hit, which ignores every modifier but stages.
    pub(super) fn confusion_damage(&mut self, side: SideId) -> u32 {
        let pokemon = self.active(side);
        let input = DamageInput::neutral(
            pokemon.level,
            CONFUSION_POWER,
            apply_stage(pokemon.stats.attack, pokemon.boosts.get(BoostStat::Attack)),
            apply_stage(
                pokemon.stats.defense,
                pokemon.boosts.get(BoostStat::Defense),
            ),
        );
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }
}

#[cfg(test)]
mod tests {
    use super::chain;

    #[test]
    fn chained_modifiers_round_at_each_step() {
        assert_eq!(chain([]), 4096);
        assert_eq!(chain([6144, 6144]), 9216);
        assert_eq!(chain([5324, 4915]), 6389);
    }
}
