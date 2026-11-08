//! The editable content format. Field names and shapes follow Pokémon Showdown's data files;
//! every reference is by name and is resolved when a [`Dex`](super::Dex) is built.

use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer, Serialize};

use super::handlers::HandlerSource;
use super::{Fraction, MoveCategory, MoveTarget, Status, VolatileStatus};
use crate::stats::{Boosts, Stat, StatTable};

/// A complete content pack.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DexSource {
    /// The type chart.
    pub types: Vec<TypeSource>,
    /// Weather conditions.
    #[serde(default)]
    pub weathers: Vec<WeatherSource>,
    /// Natures; a set without a nature is neutral.
    #[serde(default)]
    pub natures: Vec<NatureSource>,
    /// Species.
    pub species: Vec<SpeciesSource>,
    /// Moves. A move named "Struggle" replaces the built-in one.
    pub moves: Vec<MoveSource>,
    /// Abilities.
    #[serde(default)]
    pub abilities: Vec<AbilitySource>,
    /// Items.
    #[serde(default)]
    pub items: Vec<ItemSource>,
}

/// A type, described like Showdown's `TypeChart` entries: how much damage it takes.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TypeSource {
    /// Display name, also used to reference the type.
    pub name: String,
    /// Keyed by an attacking type, a status ID, or a weather name. Values are Showdown's codes:
    /// 0 normal, 1 weak (×2), 2 resists (×0.5), 3 immune. Unlisted keys are 0.
    #[serde(default)]
    pub damage_taken: BTreeMap<String, u8>,
    /// Whether this type's damaging moves thaw a frozen target, as Fire's do.
    #[serde(default)]
    pub thaws_frozen_targets: bool,
}

/// A weather condition.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WeatherSource {
    /// Display name, also used to reference the weather.
    pub name: String,
    /// Turns it lasts.
    #[serde(default = "default_weather_duration")]
    pub duration: u8,
    /// Damage multipliers for moves of each type (Showdown's `onWeatherModifyDamage`).
    #[serde(default)]
    pub damage_modifiers: BTreeMap<String, Fraction>,
    /// Fraction of max HP each active creature loses at the end of the turn (`onWeather`),
    /// unless its type takes no damage from this weather.
    #[serde(default)]
    pub residual_damage: Option<Fraction>,
    /// Defensive stat boosts for a type, applied before other stat modifiers.
    #[serde(default)]
    pub defense_boosts: Vec<WeatherDefenseBoostSource>,
    /// Statuses that cannot be inflicted while it lasts.
    #[serde(default)]
    pub prevents_statuses: Vec<Status>,
}

fn default_weather_duration() -> u8 {
    5
}

/// A defensive stat boost a weather grants to one type.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WeatherDefenseBoostSource {
    /// The type that receives the boost.
    #[serde(rename = "type")]
    pub type_name: String,
    /// `def` or `spd`.
    pub stat: Stat,
    /// The multiplier.
    pub modifier: Fraction,
}

/// A nature.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NatureSource {
    /// Display name, also used to reference the nature.
    pub name: String,
    /// The stat raised by 10%.
    #[serde(default)]
    pub plus: Option<Stat>,
    /// The stat lowered by 10%.
    #[serde(default)]
    pub minus: Option<Stat>,
}

/// A species.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SpeciesSource {
    /// Display name, also used to reference the species.
    pub name: String,
    /// One or two distinct type names.
    pub types: Vec<String>,
    /// Base stats.
    pub base_stats: StatTable,
}

/// A move, in the shape of Showdown's move data.
///
/// Primary effects (`boosts`, `status`, `volatileStatus`, `weather`, `heal`) apply to the
/// target without a roll. `self` boosts the user after one shared roll. Each entry in
/// `secondaries` rolls its own chance.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MoveSource {
    /// Display name, also used to reference the move.
    pub name: String,
    /// The type, or `null` (or `"???"`) for typeless moves such as Struggle.
    #[serde(rename = "type")]
    pub type_name: Option<String>,
    /// `Physical`, `Special`, or `Status`.
    pub category: MoveCategory,
    /// Base power; zero for status moves.
    #[serde(default)]
    pub base_power: u16,
    /// Accuracy percentage, or `true` for moves that never miss.
    pub accuracy: Accuracy,
    /// Base PP before PP Ups.
    pub pp: u8,
    /// Priority bracket; higher goes first.
    #[serde(default)]
    pub priority: i8,
    /// `normal` (the opponent) or `self`.
    #[serde(default)]
    pub target: MoveTarget,
    /// Critical-hit ratio: 1 is normal, each step up raises the odds, 0 never crits.
    #[serde(default = "default_crit_ratio")]
    pub crit_ratio: u8,
    /// A fixed hit count or a `[min, max]` range.
    #[serde(default)]
    pub multihit: Option<Multihit>,
    /// Fraction of damage dealt restored to the user.
    #[serde(default)]
    pub drain: Option<Fraction>,
    /// Fraction of damage dealt the user takes as recoil.
    #[serde(default)]
    pub recoil: Option<Fraction>,
    /// The user loses 1/4 of its max HP after hitting, like Struggle.
    #[serde(default)]
    pub struggle_recoil: bool,
    /// Move flags.
    #[serde(default)]
    pub flags: MoveFlags,
    /// Whether type immunities are ignored. Defaults to `true` for status moves and `false`
    /// otherwise, as in Showdown.
    #[serde(default)]
    pub ignore_immunity: Option<bool>,
    /// Stat stages applied to the target.
    #[serde(default)]
    pub boosts: Option<Boosts>,
    /// Status inflicted on the target.
    #[serde(default)]
    pub status: Option<Status>,
    /// Volatile status inflicted on the target.
    #[serde(default)]
    pub volatile_status: Option<VolatileStatus>,
    /// Weather summoned by name.
    #[serde(default)]
    pub weather: Option<String>,
    /// Fraction of the target's max HP restored.
    #[serde(default)]
    pub heal: Option<Fraction>,
    /// Effects on the user.
    #[serde(default, rename = "self")]
    pub self_effect: Option<SelfEffectSource>,
    /// Chance-based effects, each rolled separately.
    #[serde(default)]
    pub secondaries: Vec<SecondarySource>,
}

fn default_crit_ratio() -> u8 {
    1
}

/// A hit count: `2` or `[2, 5]`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Multihit {
    /// Always this many hits.
    Fixed(u8),
    /// A range; `[2, 5]` uses the 35/35/15/15 distribution.
    Range(u8, u8),
}

/// Move flags, written like Showdown's `flags: {contact: 1}`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MoveFlags {
    /// The move makes contact.
    #[serde(default, deserialize_with = "deserialize_flag")]
    pub contact: bool,
}

/// Effects on the move's user.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SelfEffectSource {
    /// Stat stages applied to the user.
    pub boosts: Boosts,
}

/// A chance-based effect.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SecondarySource {
    /// Percent chance; omitted always applies (the roll still happens).
    #[serde(default)]
    pub chance: Option<u8>,
    /// Stat stages applied to the target.
    #[serde(default)]
    pub boosts: Option<Boosts>,
    /// Status inflicted on the target.
    #[serde(default)]
    pub status: Option<Status>,
    /// Volatile status inflicted on the target.
    #[serde(default)]
    pub volatile_status: Option<VolatileStatus>,
    /// Effects on the user.
    #[serde(default, rename = "self")]
    pub self_effect: Option<SelfEffectSource>,
}

/// An ability.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AbilitySource {
    /// Display name, also used to reference the ability.
    pub name: String,
    /// What it does.
    #[serde(default)]
    pub handlers: Vec<HandlerSource>,
}

/// An item.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ItemSource {
    /// Display name, also used to reference the item.
    pub name: String,
    /// Whether it is used up when a one-shot handler triggers (`endureFromFull`,
    /// `healAtThreshold`, or `cureStatus`), like a berry or Focus Sash.
    #[serde(default)]
    pub consumable: bool,
    /// What it does.
    #[serde(default)]
    pub handlers: Vec<HandlerSource>,
}

/// A move's accuracy, written as a percentage or `true` like Showdown.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Accuracy(pub Option<u8>);

impl Serialize for Accuracy {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self.0 {
            Some(percent) => serializer.serialize_u8(percent),
            None => serializer.serialize_bool(true),
        }
    }
}

impl<'de> Deserialize<'de> for Accuracy {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum Written {
            AlwaysHits(bool),
            Percent(u8),
        }
        match Written::deserialize(deserializer)? {
            Written::AlwaysHits(true) => Ok(Self(None)),
            Written::AlwaysHits(false) => Err(serde::de::Error::custom(
                "accuracy must be true or a percentage",
            )),
            Written::Percent(percent) => Ok(Self(Some(percent))),
        }
    }
}

fn deserialize_flag<'de, D: Deserializer<'de>>(deserializer: D) -> Result<bool, D::Error> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Flag {
        Bool(bool),
        Number(u8),
    }
    Ok(match Flag::deserialize(deserializer)? {
        Flag::Bool(value) => value,
        Flag::Number(value) => value != 0,
    })
}
