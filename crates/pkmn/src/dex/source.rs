//! The editable content format. Every reference is by name and resolved when a [`Dex`] is built.
//!
//! [`Dex`]: super::Dex

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::{EffectTarget, Fraction, HitRange, MoveCategory, MoveTarget, Recoil, StatusKind};
use crate::stats::{BoostStat, Stat, StatTable};

/// A complete content pack: types, weather, species, and moves.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DexSource {
    /// Every type and how it fares when attacking the others.
    pub types: Vec<TypeSource>,
    /// Weather conditions moves can summon.
    #[serde(default)]
    pub weathers: Vec<WeatherSource>,
    /// Species that can be put on a team.
    pub species: Vec<SpeciesSource>,
    /// Moves species can use. A move named "Struggle" replaces the built-in one.
    pub moves: Vec<MoveSource>,
}

/// A type and its attacking matchups. Unlisted matchups are neutral.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TypeSource {
    /// Display name, also used to reference the type.
    pub name: String,
    /// Types this type deals double damage to.
    #[serde(default)]
    pub super_effective_against: Vec<String>,
    /// Types this type deals half damage to.
    #[serde(default)]
    pub not_very_effective_against: Vec<String>,
    /// Types this type cannot damage.
    #[serde(default)]
    pub no_effect_against: Vec<String>,
    /// Statuses creatures of this type cannot receive. `poison` also blocks `toxic`.
    #[serde(default)]
    pub status_immunities: Vec<StatusKind>,
    /// Whether damaging moves of this type thaw a frozen target.
    #[serde(default)]
    pub thaws_frozen_targets: bool,
}

/// A weather condition.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WeatherSource {
    /// Display name, also used to reference the weather.
    pub name: String,
    /// Turns the weather lasts once summoned.
    #[serde(default = "default_weather_duration")]
    pub duration: u8,
    /// Damage multipliers applied to moves by type name.
    #[serde(default)]
    pub damage_modifiers: BTreeMap<String, Fraction>,
    /// Fraction of max HP dealt to each active creature at the end of every turn.
    #[serde(default)]
    pub residual_damage: Option<Fraction>,
    /// Types that ignore the residual damage.
    #[serde(default)]
    pub residual_damage_immune_types: Vec<String>,
    /// Defensive stat boosts granted to creatures of a type.
    #[serde(default)]
    pub defense_boosts: Vec<WeatherDefenseBoostSource>,
    /// Statuses that cannot be inflicted while the weather is active.
    #[serde(default)]
    pub prevents_statuses: Vec<StatusKind>,
}

fn default_weather_duration() -> u8 {
    5
}

/// A defensive stat boost a weather grants to one type.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WeatherDefenseBoostSource {
    /// The type that receives the boost.
    #[serde(rename = "type")]
    pub type_name: String,
    /// `defense` or `special_defense`.
    pub stat: Stat,
    /// The multiplier applied to the stat.
    pub modifier: Fraction,
}

/// A species.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SpeciesSource {
    /// Display name, also used to reference the species.
    pub name: String,
    /// One or two distinct type names.
    pub types: Vec<String>,
    /// Base stats.
    pub base_stats: StatTable,
}

/// A move.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoveSource {
    /// Display name, also used to reference the move.
    pub name: String,
    /// The move's type, or `null` for typeless moves such as Struggle.
    #[serde(rename = "type")]
    pub type_name: Option<String>,
    /// Physical, special, or status.
    pub category: MoveCategory,
    /// Base power; zero for status moves.
    #[serde(default)]
    pub power: u16,
    /// Accuracy percentage, or omitted for moves that never miss.
    #[serde(default)]
    pub accuracy: Option<u8>,
    /// Base PP before PP Ups.
    pub pp: u8,
    /// Priority bracket; higher goes first.
    #[serde(default)]
    pub priority: i8,
    /// Who the move is aimed at.
    #[serde(default)]
    pub target: MoveTarget,
    /// Extra critical-hit stages beyond the default.
    #[serde(default)]
    pub crit_stage: u8,
    /// Hit count range for multi-hit moves.
    #[serde(default)]
    pub hits: Option<HitRange>,
    /// Fraction of damage dealt restored to the user.
    #[serde(default)]
    pub drain: Option<Fraction>,
    /// Damage the user takes after hitting.
    #[serde(default)]
    pub recoil: Option<Recoil>,
    /// Whether a status move fails against types immune to its type.
    #[serde(default)]
    pub respects_type_immunity: bool,
    /// Effects applied when the move hits.
    #[serde(default)]
    pub effects: Vec<MoveEffectSource>,
}

/// An effect a move applies when it hits.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoveEffectSource {
    /// Percent chance the effect applies; omitted means it always applies.
    #[serde(default)]
    pub chance: Option<u8>,
    /// Who receives the effect.
    #[serde(default)]
    pub target: EffectTarget,
    /// What the effect does.
    pub effect: EffectSource,
}

/// What an effect does, referencing weather by name.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum EffectSource {
    /// Changes a stat stage.
    Boost {
        /// The stat to change.
        stat: BoostStat,
        /// Stages to add; negative values lower the stat.
        stages: i8,
    },
    /// Inflicts a non-volatile status.
    Status(StatusKind),
    /// Confuses the recipient for two to five turns.
    Confuse,
    /// Makes the recipient flinch if it has not moved yet this turn.
    Flinch,
    /// Summons a weather by name.
    Weather(String),
    /// Restores a fraction of the recipient's max HP.
    Heal(Fraction),
}
