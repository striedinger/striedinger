//! Ability and item behavior as data. Each handler is named after the Pokémon Showdown event it
//! mirrors (`onModifyAtk`, `onBasePower`, `onResidual`, ...), so a new ability or item is
//! usually a list of handlers rather than code.

use serde::{Deserialize, Serialize};

use super::{Dex, DexError, Fraction, MoveCategory, Status, TypeId, WeatherId, validate_fraction};
use crate::stats::{Boosts, Stat};

/// A handler as written in a content pack, referencing types and weather by name.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub enum HandlerSource {
    /// `onModifyAtk`, `onModifyDef`, ...: multiplies one of the holder's stats.
    ModifyStat {
        /// The stat; not HP.
        stat: Stat,
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// `onBasePower`: multiplies the base power of the holder's moves.
    BasePower {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// `onModifyDamage`: multiplies damage the holder deals.
    ModifyDamage {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// `onSourceModifyDamage`: multiplies damage the holder takes.
    SourceModifyDamage {
        /// The multiplier.
        modifier: Fraction,
        /// Conditions that must all hold.
        #[serde(default)]
        conditions: Vec<ConditionSource>,
    },
    /// `onModifySTAB`: replaces the ×1.5 same-type attack bonus.
    ModifyStab(Fraction),
    /// The holder's physical moves skip the burn penalty, like Guts.
    IgnoreBurnPenalty,
    /// `onImmunity`: moves of this type cannot hit the holder, like Levitate.
    Immunity(String),
    /// `onTryHit`: moves of this type are absorbed, healing or boosting the holder, like Volt
    /// Absorb.
    Absorb {
        /// The absorbed type.
        #[serde(rename = "type")]
        type_name: String,
        /// Fraction of max HP restored.
        #[serde(default)]
        heal: Option<Fraction>,
        /// Stat stages gained.
        #[serde(default)]
        boosts: Option<Boosts>,
    },
    /// `onSetStatus`: the holder cannot receive this status, like Limber.
    StatusImmunity(Status),
    /// `onStart`: summons a weather when the holder enters, like Drizzle.
    StartWeather(String),
    /// `onStart`: changes the foe's stat stages when the holder enters, like Intimidate.
    StartFoeBoosts(Boosts),
    /// `onDamagingHit` with contact: may inflict a status on the attacker, like Static.
    ContactStatus {
        /// Percent chance; omitted always applies.
        #[serde(default)]
        chance: Option<u8>,
        /// The status.
        status: Status,
    },
    /// `onDamagingHit` with contact: the attacker loses this fraction of its max HP, like
    /// Rough Skin.
    ContactDamage(Fraction),
    /// `onResidual`: restores this fraction of max HP each turn, like Leftovers.
    ResidualHeal(Fraction),
    /// `onResidual`: changes stat stages each turn after the first, like Speed Boost.
    ResidualBoosts(Boosts),
    /// `choicelock`: locks the holder into its first move until it switches out.
    ChoiceLock,
    /// `onDisableMove`: the holder cannot select status moves, like Assault Vest.
    DisableStatusMoves,
    /// `onDamage`: survives a move that would knock it out from full HP, like Sturdy.
    EndureFromFull,
    /// `onUpdate`: restores HP at or below a fraction of max HP, like Sitrus Berry. A
    /// consumable item does this once; an ability or a lasting item does it at every `Update`
    /// while the condition holds.
    HealAtThreshold {
        /// The HP fraction that triggers it.
        threshold: Fraction,
        /// Fraction of max HP restored.
        amount: Fraction,
    },
    /// `onUpdate`: cures a status or confusion, like Lum Berry.
    CureStatus,
    /// `onAfterMoveSecondarySelf`: the holder loses this fraction of its max HP after a
    /// damaging move, like Life Orb.
    AfterMoveRecoil(Fraction),
}

/// A modifier condition, referencing types and weather by name.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub enum ConditionSource {
    /// The move has this type.
    MoveType(String),
    /// The move has this category.
    Category(MoveCategory),
    /// The holder's HP is at or below this fraction of its max HP.
    HpAtMost(Fraction),
    /// The holder is at full HP.
    FullHp,
    /// The holder has a status.
    Statused,
    /// This weather is active.
    Weather(String),
    /// The move is super effective against its target.
    SuperEffective,
}

/// A compiled handler, mirroring [`HandlerSource`] with IDs and 4096-based modifiers.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Handler {
    /// See [`HandlerSource::ModifyStat`].
    ModifyStat {
        /// The stat.
        stat: Stat,
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`HandlerSource::BasePower`].
    BasePower {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`HandlerSource::ModifyDamage`].
    ModifyDamage {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`HandlerSource::SourceModifyDamage`].
    SourceModifyDamage {
        /// The 4096-based multiplier.
        modifier: u32,
        /// Conditions that must all hold.
        conditions: Vec<Condition>,
    },
    /// See [`HandlerSource::ModifyStab`]; the 4096-based bonus.
    ModifyStab(u32),
    /// See [`HandlerSource::IgnoreBurnPenalty`].
    IgnoreBurnPenalty,
    /// See [`HandlerSource::Immunity`].
    Immunity(TypeId),
    /// See [`HandlerSource::Absorb`].
    Absorb {
        /// The absorbed type.
        move_type: TypeId,
        /// Fraction of max HP restored.
        heal: Option<Fraction>,
        /// Stat stages gained.
        boosts: Option<Boosts>,
    },
    /// See [`HandlerSource::StatusImmunity`].
    StatusImmunity(Status),
    /// See [`HandlerSource::StartWeather`].
    StartWeather(WeatherId),
    /// See [`HandlerSource::StartFoeBoosts`].
    StartFoeBoosts(Boosts),
    /// See [`HandlerSource::ContactStatus`].
    ContactStatus {
        /// Percent chance; `None` always applies.
        chance: Option<u8>,
        /// The status.
        status: Status,
    },
    /// See [`HandlerSource::ContactDamage`].
    ContactDamage(Fraction),
    /// See [`HandlerSource::ResidualHeal`].
    ResidualHeal(Fraction),
    /// See [`HandlerSource::ResidualBoosts`].
    ResidualBoosts(Boosts),
    /// See [`HandlerSource::ChoiceLock`].
    ChoiceLock,
    /// See [`HandlerSource::DisableStatusMoves`].
    DisableStatusMoves,
    /// See [`HandlerSource::EndureFromFull`].
    EndureFromFull,
    /// See [`HandlerSource::HealAtThreshold`].
    HealAtThreshold {
        /// The HP fraction that triggers it.
        threshold: Fraction,
        /// Fraction of max HP restored.
        amount: Fraction,
    },
    /// See [`HandlerSource::CureStatus`].
    CureStatus,
    /// See [`HandlerSource::AfterMoveRecoil`].
    AfterMoveRecoil(Fraction),
}

/// One bit per handler kind, so the engine can skip creatures with nothing to contribute.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct HandlerMask(u32);

impl HandlerMask {
    /// `ModifyStat` for Speed, kept separate so speed checks skip other stat modifiers.
    pub const MODIFY_SPEED: Self = Self(1 << 0);
    /// `ModifyStat` for any other stat.
    pub const MODIFY_STAT: Self = Self(1 << 1);
    /// `BasePower`.
    pub const BASE_POWER: Self = Self(1 << 2);
    /// `ModifyDamage`.
    pub const MODIFY_DAMAGE: Self = Self(1 << 3);
    /// `SourceModifyDamage`.
    pub const SOURCE_MODIFY_DAMAGE: Self = Self(1 << 4);
    /// `ModifyStab` or `IgnoreBurnPenalty`.
    pub const ATTACK_RULES: Self = Self(1 << 5);
    /// `Immunity` or `Absorb`.
    pub const TRY_HIT: Self = Self(1 << 6);
    /// `StatusImmunity`.
    pub const STATUS_IMMUNITY: Self = Self(1 << 7);
    /// `StartWeather` or `StartFoeBoosts`.
    pub const START: Self = Self(1 << 8);
    /// `ContactStatus` or `ContactDamage`.
    pub const DAMAGING_HIT: Self = Self(1 << 9);
    /// `ResidualHeal` or `ResidualBoosts`.
    pub const RESIDUAL: Self = Self(1 << 10);
    /// `ChoiceLock`.
    pub const CHOICE_LOCK: Self = Self(1 << 11);
    /// `DisableStatusMoves`.
    pub const DISABLE_STATUS_MOVES: Self = Self(1 << 12);
    /// `EndureFromFull`.
    pub const DAMAGE: Self = Self(1 << 13);
    /// `HealAtThreshold` or `CureStatus`.
    pub const UPDATE: Self = Self(1 << 14);
    /// `AfterMoveRecoil`.
    pub const AFTER_MOVE: Self = Self(1 << 15);

    /// Whether any kind in `other` is present.
    #[must_use]
    pub fn intersects(self, other: Self) -> bool {
        self.0 & other.0 != 0
    }

    /// Both sets of kinds.
    #[must_use]
    pub fn union(self, other: Self) -> Self {
        Self(self.0 | other.0)
    }
}

impl Handler {
    /// The mask bit for this handler's kind.
    #[must_use]
    pub fn kind(&self) -> HandlerMask {
        match self {
            Self::ModifyStat {
                stat: Stat::Speed, ..
            } => HandlerMask::MODIFY_SPEED,
            Self::ModifyStat { .. } => HandlerMask::MODIFY_STAT,
            Self::BasePower { .. } => HandlerMask::BASE_POWER,
            Self::ModifyDamage { .. } => HandlerMask::MODIFY_DAMAGE,
            Self::SourceModifyDamage { .. } => HandlerMask::SOURCE_MODIFY_DAMAGE,
            Self::ModifyStab(_) | Self::IgnoreBurnPenalty => HandlerMask::ATTACK_RULES,
            Self::Immunity(_) | Self::Absorb { .. } => HandlerMask::TRY_HIT,
            Self::StatusImmunity(_) => HandlerMask::STATUS_IMMUNITY,
            Self::StartWeather(_) | Self::StartFoeBoosts(_) => HandlerMask::START,
            Self::ContactStatus { .. } | Self::ContactDamage(_) => HandlerMask::DAMAGING_HIT,
            Self::ResidualHeal(_) | Self::ResidualBoosts(_) => HandlerMask::RESIDUAL,
            Self::ChoiceLock => HandlerMask::CHOICE_LOCK,
            Self::DisableStatusMoves => HandlerMask::DISABLE_STATUS_MOVES,
            Self::EndureFromFull => HandlerMask::DAMAGE,
            Self::HealAtThreshold { .. } | Self::CureStatus => HandlerMask::UPDATE,
            Self::AfterMoveRecoil(_) => HandlerMask::AFTER_MOVE,
        }
    }
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

/// A compiled ability.
#[derive(Clone, Debug)]
pub struct AbilityData {
    /// Display name.
    pub name: String,
    /// What it does.
    pub handlers: Vec<Handler>,
    /// The kinds of handler it has.
    pub mask: HandlerMask,
}

/// A compiled item.
#[derive(Clone, Debug)]
pub struct ItemData {
    /// Display name.
    pub name: String,
    /// Whether one-shot handlers use it up.
    pub consumable: bool,
    /// What it does.
    pub handlers: Vec<Handler>,
    /// The kinds of handler it has.
    pub mask: HandlerMask,
}

impl Dex {
    pub(super) fn compile_handlers(
        &self,
        sources: &[HandlerSource],
        owner: &str,
    ) -> Result<(Vec<Handler>, HandlerMask), DexError> {
        let handlers: Vec<Handler> = sources
            .iter()
            .map(|source| self.compile_handler(source, owner))
            .collect::<Result<_, _>>()?;
        let mask = handlers
            .iter()
            .fold(HandlerMask::default(), |mask, handler| {
                mask.union(handler.kind())
            });
        Ok((handlers, mask))
    }

    fn compile_handler(&self, source: &HandlerSource, owner: &str) -> Result<Handler, DexError> {
        let modifier =
            |fraction: &Fraction| validate_fraction(*fraction, owner).map(Fraction::to_modifier);
        let fraction = |fraction: &Fraction| validate_fraction(*fraction, owner);
        let boosts = |boosts: &Boosts| {
            if boosts.is_empty() {
                Err(DexError::invalid(
                    owner,
                    "boosts need at least one non-zero stage",
                ))
            } else {
                Ok(*boosts)
            }
        };
        Ok(match source {
            HandlerSource::ModifyStat {
                stat,
                modifier: value,
                conditions,
            } => {
                if *stat == Stat::Hp {
                    return Err(DexError::invalid(owner, "modifyStat cannot change HP"));
                }
                Handler::ModifyStat {
                    stat: *stat,
                    modifier: modifier(value)?,
                    conditions: self.compile_conditions(conditions, owner)?,
                }
            }
            HandlerSource::BasePower {
                modifier: value,
                conditions,
            } => Handler::BasePower {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            HandlerSource::ModifyDamage {
                modifier: value,
                conditions,
            } => Handler::ModifyDamage {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            HandlerSource::SourceModifyDamage {
                modifier: value,
                conditions,
            } => Handler::SourceModifyDamage {
                modifier: modifier(value)?,
                conditions: self.compile_conditions(conditions, owner)?,
            },
            HandlerSource::ModifyStab(value) => Handler::ModifyStab(modifier(value)?),
            HandlerSource::IgnoreBurnPenalty => Handler::IgnoreBurnPenalty,
            HandlerSource::Immunity(type_name) => {
                Handler::Immunity(self.resolve_type(type_name, owner)?)
            }
            HandlerSource::Absorb {
                type_name,
                heal,
                boosts: gained,
            } => Handler::Absorb {
                move_type: self.resolve_type(type_name, owner)?,
                heal: heal.as_ref().map(fraction).transpose()?,
                boosts: gained.as_ref().map(boosts).transpose()?,
            },
            HandlerSource::StatusImmunity(status) => Handler::StatusImmunity(*status),
            HandlerSource::StartWeather(weather_name) => {
                Handler::StartWeather(self.resolve_weather(weather_name, owner)?)
            }
            HandlerSource::StartFoeBoosts(value) => Handler::StartFoeBoosts(boosts(value)?),
            HandlerSource::ContactStatus { chance, status } => {
                validate_chance(*chance, owner)?;
                Handler::ContactStatus {
                    chance: *chance,
                    status: *status,
                }
            }
            HandlerSource::ContactDamage(value) => Handler::ContactDamage(fraction(value)?),
            HandlerSource::ResidualHeal(value) => Handler::ResidualHeal(fraction(value)?),
            HandlerSource::ResidualBoosts(value) => Handler::ResidualBoosts(boosts(value)?),
            HandlerSource::ChoiceLock => Handler::ChoiceLock,
            HandlerSource::DisableStatusMoves => Handler::DisableStatusMoves,
            HandlerSource::EndureFromFull => Handler::EndureFromFull,
            HandlerSource::HealAtThreshold { threshold, amount } => Handler::HealAtThreshold {
                threshold: fraction(threshold)?,
                amount: fraction(amount)?,
            },
            HandlerSource::CureStatus => Handler::CureStatus,
            HandlerSource::AfterMoveRecoil(value) => Handler::AfterMoveRecoil(fraction(value)?),
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
