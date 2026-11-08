//! Abilities and items. Both are "traits": a name plus a list of effects drawn from one
//! vocabulary, so a new ability or item is usually data rather than code.

use serde::{Deserialize, Serialize};

use super::{
    Dex, DexError, Fraction, MoveCategory, StatusKind, TypeId, WeatherId, validate_fraction,
};
use crate::stats::{BoostStat, Stat};

/// An ability or item as written in a content pack.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TraitSource {
    /// Display name, also used to reference the trait.
    pub name: String,
    /// Items only: whether the item is used up the first time a one-shot effect triggers
    /// (`endure_from_full`, `heal_at_threshold`, or `cure_status`).
    #[serde(default)]
    pub consumable: bool,
    /// What the trait does.
    #[serde(default)]
    pub effects: Vec<TraitEffectSource>,
}

/// A trait effect, referencing types and weather by name.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum TraitEffectSource {
    /// Multiplies one of the holder's stats when every condition holds.
    StatModifier {
        /// The stat; not HP.
        stat: Stat,
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// Multiplies the base power of the holder's moves.
    PowerModifier {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// Multiplies damage the holder deals.
    DamageDealtModifier {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// Multiplies damage the holder takes.
    DamageTakenModifier {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// Replaces the ×1.5 same-type attack bonus.
    StabModifier(Fraction),
    /// The holder's physical moves ignore the burn penalty.
    IgnoresBurn,
    /// Moves of this type cannot hit the holder (checked like a type-chart immunity).
    TypeImmunity(String),
    /// Moves of this type are absorbed instead of hitting, healing or boosting the holder.
    AbsorbType {
        /// The absorbed type.
        #[serde(rename = "type")]
        type_name: String,
        /// Fraction of max HP restored.
        #[serde(default)]
        heal: Option<Fraction>,
        /// Stat raised.
        #[serde(default)]
        boost: Option<BoostSource>,
    },
    /// The holder cannot receive this status; `poison` also blocks `toxic`.
    StatusImmunity(StatusKind),
    /// Summons a weather when the holder enters battle.
    EntryWeather(String),
    /// Changes the opposing creature's stat when the holder enters battle.
    EntryOpponentBoost(BoostSource),
    /// When a contact move damages the holder, may inflict a status on the attacker.
    ContactStatus {
        /// Percent chance; omitted always applies.
        #[serde(default)]
        chance: Option<u8>,
        /// The status.
        status: StatusKind,
    },
    /// When a contact move damages the holder, the attacker loses this fraction of its max HP.
    ContactDamage(Fraction),
    /// Restores this fraction of max HP at the end of each turn.
    EndOfTurnHeal(Fraction),
    /// Changes a stat at the end of each turn, except the turn the holder switched in.
    EndOfTurnBoost(BoostSource),
    /// Locks the holder into the first move it uses until it switches out.
    ChoiceLock,
    /// The holder cannot select status moves.
    BlocksStatusMoves,
    /// Survives a move that would knock it out from full HP with 1 HP left.
    EndureFromFull,
    /// Restores HP once the holder is at or below a fraction of its max HP.
    HealAtThreshold {
        /// The HP fraction that triggers it.
        threshold: Fraction,
        /// Fraction of max HP restored.
        amount: Fraction,
    },
    /// Cures a non-volatile status or confusion.
    CureStatus,
    /// After a damaging move, the holder loses this fraction of its max HP.
    RecoilAfterAttack(Fraction),
}

/// A stat change written as `{"stat": "attack", "stages": 1}`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BoostSource {
    /// The stat.
    pub stat: BoostStat,
    /// Stages to add; negative values lower it.
    pub stages: i8,
}

/// A condition on a modifier, referencing types and weather by name.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum ConditionSource {
    /// The move has this type.
    MoveType(String),
    /// The move has this category.
    Category(MoveCategory),
    /// The holder's HP is at or below this fraction of its max HP.
    HpAtMost(Fraction),
    /// The holder is at full HP.
    FullHp,
    /// The holder has a non-volatile status.
    Statused,
    /// This weather is active.
    Weather(String),
    /// The move is super effective against its target.
    SuperEffective,
}

/// A compiled ability or item.
#[derive(Clone, Debug)]
pub struct TraitData {
    /// Display name.
    pub name: String,
    /// Whether the item is used up when a one-shot effect triggers.
    pub consumable: bool,
    /// What the trait does.
    pub effects: Vec<TraitEffect>,
}

/// A compiled trait effect, mirroring [`TraitEffectSource`] with IDs and 4096-based modifiers.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TraitEffect {
    /// See [`TraitEffectSource::StatModifier`].
    StatModifier {
        /// The stat.
        stat: Stat,
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`TraitEffectSource::PowerModifier`].
    PowerModifier {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`TraitEffectSource::DamageDealtModifier`].
    DamageDealtModifier {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`TraitEffectSource::DamageTakenModifier`].
    DamageTakenModifier {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`TraitEffectSource::StabModifier`]; the 4096-based bonus.
    StabModifier(u32),
    /// See [`TraitEffectSource::IgnoresBurn`].
    IgnoresBurn,
    /// See [`TraitEffectSource::TypeImmunity`].
    TypeImmunity(TypeId),
    /// See [`TraitEffectSource::AbsorbType`].
    AbsorbType {
        /// The absorbed type.
        move_type: TypeId,
        /// Fraction of max HP restored.
        heal: Option<Fraction>,
        /// Stat and stages raised.
        boost: Option<(BoostStat, i8)>,
    },
    /// See [`TraitEffectSource::StatusImmunity`].
    StatusImmunity(StatusKind),
    /// See [`TraitEffectSource::EntryWeather`].
    EntryWeather(WeatherId),
    /// See [`TraitEffectSource::EntryOpponentBoost`].
    EntryOpponentBoost(BoostStat, i8),
    /// See [`TraitEffectSource::ContactStatus`].
    ContactStatus {
        /// Percent chance; `None` always applies.
        chance: Option<u8>,
        /// The status.
        status: StatusKind,
    },
    /// See [`TraitEffectSource::ContactDamage`].
    ContactDamage(Fraction),
    /// See [`TraitEffectSource::EndOfTurnHeal`].
    EndOfTurnHeal(Fraction),
    /// See [`TraitEffectSource::EndOfTurnBoost`].
    EndOfTurnBoost(BoostStat, i8),
    /// See [`TraitEffectSource::ChoiceLock`].
    ChoiceLock,
    /// See [`TraitEffectSource::BlocksStatusMoves`].
    BlocksStatusMoves,
    /// See [`TraitEffectSource::EndureFromFull`].
    EndureFromFull,
    /// See [`TraitEffectSource::HealAtThreshold`].
    HealAtThreshold {
        /// The HP fraction that triggers it.
        threshold: Fraction,
        /// Fraction of max HP restored.
        amount: Fraction,
    },
    /// See [`TraitEffectSource::CureStatus`].
    CureStatus,
    /// See [`TraitEffectSource::RecoilAfterAttack`].
    RecoilAfterAttack(Fraction),
}

/// A compiled modifier condition, mirroring [`ConditionSource`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Condition {
    /// See [`ConditionSource::MoveType`].
    MoveType(TypeId),
    /// See [`ConditionSource::Category`].
    Category(MoveCategory),
    /// See [`ConditionSource::HpAtMost`].
    HpAtMost(Fraction),
    /// See [`ConditionSource::FullHp`].
    FullHp,
    /// See [`ConditionSource::Statused`].
    Statused,
    /// See [`ConditionSource::Weather`].
    Weather(WeatherId),
    /// See [`ConditionSource::SuperEffective`].
    SuperEffective,
}

impl Dex {
    pub(super) fn compile_trait(
        &self,
        source: &TraitSource,
        item: bool,
    ) -> Result<TraitData, DexError> {
        let name = source.name.as_str();
        if source.consumable && !item {
            return Err(DexError::invalid(name, "only items can be consumable"));
        }
        let effects = source
            .effects
            .iter()
            .map(|effect| self.compile_trait_effect(effect, name))
            .collect::<Result<_, _>>()?;
        Ok(TraitData {
            name: source.name.clone(),
            consumable: source.consumable,
            effects,
        })
    }

    fn compile_trait_effect(
        &self,
        source: &TraitEffectSource,
        owner: &str,
    ) -> Result<TraitEffect, DexError> {
        let modifier =
            |fraction: &Fraction| validate_fraction(*fraction, owner).map(Fraction::to_modifier);
        let fraction = |fraction: &Fraction| validate_fraction(*fraction, owner);
        let boost = |boost: &BoostSource| {
            if boost.stages == 0 {
                Err(DexError::invalid(owner, "boosts need non-zero stages"))
            } else {
                Ok((boost.stat, boost.stages))
            }
        };
        Ok(match source {
            TraitEffectSource::StatModifier {
                stat,
                modifier: value,
                conditions,
            } => {
                if *stat == Stat::Hp {
                    return Err(DexError::invalid(owner, "stat modifiers cannot change HP"));
                }
                TraitEffect::StatModifier {
                    stat: *stat,
                    modifier: modifier(value)?,
                    conditions: self.compile_conditions(conditions, owner)?,
                }
            }
            TraitEffectSource::PowerModifier {
                modifier: value,
                conditions,
            } => TraitEffect::PowerModifier {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            TraitEffectSource::DamageDealtModifier {
                modifier: value,
                conditions,
            } => TraitEffect::DamageDealtModifier {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            TraitEffectSource::DamageTakenModifier {
                modifier: value,
                conditions,
            } => TraitEffect::DamageTakenModifier {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            TraitEffectSource::StabModifier(value) => TraitEffect::StabModifier(modifier(value)?),
            TraitEffectSource::IgnoresBurn => TraitEffect::IgnoresBurn,
            TraitEffectSource::TypeImmunity(type_name) => {
                TraitEffect::TypeImmunity(self.resolve_type(type_name, owner)?)
            }
            TraitEffectSource::AbsorbType {
                type_name,
                heal,
                boost: absorb_boost,
            } => TraitEffect::AbsorbType {
                move_type: self.resolve_type(type_name, owner)?,
                heal: heal.as_ref().map(fraction).transpose()?,
                boost: absorb_boost.as_ref().map(boost).transpose()?,
            },
            TraitEffectSource::StatusImmunity(status) => TraitEffect::StatusImmunity(*status),
            TraitEffectSource::EntryWeather(weather_name) => {
                TraitEffect::EntryWeather(self.resolve_weather(weather_name, owner)?)
            }
            TraitEffectSource::EntryOpponentBoost(value) => {
                let (stat, stages) = boost(value)?;
                TraitEffect::EntryOpponentBoost(stat, stages)
            }
            TraitEffectSource::ContactStatus { chance, status } => {
                validate_chance(*chance, owner)?;
                TraitEffect::ContactStatus {
                    chance: *chance,
                    status: *status,
                }
            }
            TraitEffectSource::ContactDamage(value) => TraitEffect::ContactDamage(fraction(value)?),
            TraitEffectSource::EndOfTurnHeal(value) => TraitEffect::EndOfTurnHeal(fraction(value)?),
            TraitEffectSource::EndOfTurnBoost(value) => {
                let (stat, stages) = boost(value)?;
                TraitEffect::EndOfTurnBoost(stat, stages)
            }
            TraitEffectSource::ChoiceLock => TraitEffect::ChoiceLock,
            TraitEffectSource::BlocksStatusMoves => TraitEffect::BlocksStatusMoves,
            TraitEffectSource::EndureFromFull => TraitEffect::EndureFromFull,
            TraitEffectSource::HealAtThreshold { threshold, amount } => {
                TraitEffect::HealAtThreshold {
                    threshold: fraction(threshold)?,
                    amount: fraction(amount)?,
                }
            }
            TraitEffectSource::CureStatus => TraitEffect::CureStatus,
            TraitEffectSource::RecoilAfterAttack(value) => {
                TraitEffect::RecoilAfterAttack(fraction(value)?)
            }
        })
    }

    fn compile_conditions(
        &self,
        sources: &[ConditionSource],
        owner: &str,
    ) -> Result<Vec<Condition>, DexError> {
        sources
            .iter()
            .map(|source| {
                Ok(match source {
                    ConditionSource::MoveType(type_name) => {
                        Condition::MoveType(self.resolve_type(type_name, owner)?)
                    }
                    ConditionSource::Category(category) => Condition::Category(*category),
                    ConditionSource::HpAtMost(value) => {
                        Condition::HpAtMost(validate_fraction(*value, owner)?)
                    }
                    ConditionSource::FullHp => Condition::FullHp,
                    ConditionSource::Statused => Condition::Statused,
                    ConditionSource::Weather(weather_name) => {
                        Condition::Weather(self.resolve_weather(weather_name, owner)?)
                    }
                    ConditionSource::SuperEffective => Condition::SuperEffective,
                })
            })
            .collect()
    }
}

pub(super) fn validate_chance(chance: Option<u8>, owner: &str) -> Result<(), DexError> {
    if chance.is_some_and(|chance| chance == 0 || chance > 100) {
        return Err(DexError::invalid(
            owner,
            "chances must be between 1 and 100",
        ));
    }
    Ok(())
}
