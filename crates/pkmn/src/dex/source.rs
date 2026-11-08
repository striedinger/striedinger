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
    /// Side conditions: entry hazards and screens.
    #[serde(default)]
    pub side_conditions: Vec<SideConditionSource>,
    /// Terrains.
    #[serde(default)]
    pub terrains: Vec<TerrainSource>,
}

/// Side conditions a move removes.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ClearSideConditionsSource {
    /// Removed from the user's side.
    #[serde(default)]
    pub user: Vec<String>,
    /// Removed from the target's side.
    #[serde(default)]
    pub target: Vec<String>,
}

/// A terrain. Like Showdown's, its effects apply only to grounded creatures.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TerrainSource {
    /// Display name, also used to reference the terrain.
    pub name: String,
    /// Turns it lasts.
    #[serde(default = "default_terrain_duration")]
    pub duration: u8,
    /// Creatures immune to this type (by the type chart or an `immunity` handler) are not
    /// grounded and ignore the terrain.
    pub grounded_type: String,
    /// Base power multipliers for a grounded attacker's moves of each type.
    #[serde(default)]
    pub base_power_modifiers: BTreeMap<String, Fraction>,
    /// Base power multipliers for moves of each type against a grounded target.
    #[serde(default)]
    pub target_base_power_modifiers: BTreeMap<String, Fraction>,
    /// Fraction of max HP restored to grounded creatures at the end of each turn.
    #[serde(default)]
    pub residual_heal: Option<Fraction>,
    /// Statuses grounded creatures cannot receive.
    #[serde(default)]
    pub prevents_statuses: Vec<Status>,
    /// Volatile statuses grounded creatures cannot receive.
    #[serde(default)]
    pub prevents_volatiles: Vec<VolatileStatus>,
    /// Moves with positive priority fail against grounded targets.
    #[serde(default)]
    pub blocks_priority: bool,
}

fn default_terrain_duration() -> u8 {
    5
}

/// A condition on one side of the field, like Showdown's `sideConditions`.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SideConditionSource {
    /// Display name, also used to reference the condition.
    pub name: String,
    /// Turns it lasts; omitted lasts until the battle ends.
    #[serde(default)]
    pub duration: Option<u8>,
    /// Damage to each creature that switches in on this side, like Stealth Rock or Spikes.
    #[serde(default)]
    pub switch_in_damage: Option<SwitchInDamageSource>,
    /// Halves (or otherwise scales) damage of one category against this side, like Reflect.
    #[serde(default)]
    pub damage_modifier: Option<ScreenSource>,
    /// Showdown's `onSideResidualSubOrder`, which places the countdown among others at
    /// residual order 26: Reflect is 1, Light Screen 2. Defaults to 4, Showdown's default for
    /// side conditions.
    #[serde(default = "default_side_residual_sub_order")]
    pub residual_sub_order: u8,
}

fn default_side_residual_sub_order() -> u8 {
    4
}

/// Damage a hazard deals to a creature switching in.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SwitchInDamageSource {
    /// Fraction of max HP by layer count: setting the hazard again adds a layer, up to this
    /// list's length.
    pub layers: Vec<Fraction>,
    /// Scales the damage by this type's effectiveness against the creature, like Stealth Rock.
    #[serde(default, rename = "type")]
    pub type_name: Option<String>,
    /// Only grounded creatures take damage: those not immune to this type (by the type chart
    /// or an `immunity` handler), as Showdown's `isGrounded` does for Ground.
    #[serde(default)]
    pub grounded_type: Option<String>,
}

/// A screen's damage reduction.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ScreenSource {
    /// The category of moves it weakens.
    pub category: MoveCategory,
    /// The multiplier for non-critical hits.
    pub modifier: Fraction,
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
    /// Showdown's `learnset`: each move the species can learn, by name, with how it learns it,
    /// in Showdown's source notation: a generation, then `L` and a level (level-up), `M`
    /// (machine), `T` (tutor), `E` (egg), or `S` and an index (event), like `"9L15"` or
    /// `"9M"`. Without one, [`PokemonSet::validate`](crate::PokemonSet::validate) allows any
    /// move.
    #[serde(default)]
    pub learnset: Option<BTreeMap<String, Vec<String>>>,
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
    /// A side condition, by name, set on the side the move targets (`foeSide` or `allySide`).
    #[serde(default)]
    pub side_condition: Option<String>,
    /// A Protect-like move: fails if the user moves last, and succeeds with falling odds when
    /// used on consecutive turns.
    #[serde(default)]
    pub stalling_move: bool,
    /// After the move works, the user switches out, like U-turn.
    #[serde(default)]
    pub self_switch: bool,
    /// After the move works, the target is dragged out for a random replacement, like Roar.
    #[serde(default)]
    pub force_switch: bool,
    /// A terrain, by name, that the move sets.
    #[serde(default)]
    pub terrain: Option<String>,
    /// Stat stages the user gains on a `charge` move's first turn, like Skull Bash.
    #[serde(default)]
    pub charge_boosts: Option<Boosts>,
    /// Weathers in which a `charge` move hits at once, like Solar Beam in sun.
    #[serde(default)]
    pub charge_skipped_in: Vec<String>,
    /// While charging, every move aimed at the user misses, like Fly.
    #[serde(default)]
    pub semi_invulnerable: bool,
    /// Side conditions, by name, removed after the move works, like Rapid Spin and Defog.
    #[serde(default)]
    pub clear_side_conditions: Option<ClearSideConditionsSource>,
    /// Ends the terrain after the move works, like Defog.
    #[serde(default)]
    pub clear_terrain: bool,
    /// A substitute blocks the move's primary `boosts` even when the move bypasses it, like
    /// Defog's evasion drop (code in Showdown's `onHit`).
    #[serde(default)]
    pub substitute_blocks_boosts: bool,
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
    /// Protect blocks the move.
    #[serde(default, deserialize_with = "deserialize_flag")]
    pub protect: bool,
    /// The move charges for a turn before it hits, like Solar Beam.
    #[serde(default, deserialize_with = "deserialize_flag")]
    pub charge: bool,
    /// The move ignores a substitute, like sound moves.
    #[serde(default, deserialize_with = "deserialize_flag")]
    pub bypasssub: bool,
}

/// Effects on the move's user.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SelfEffectSource {
    /// Stat stages applied to the user.
    #[serde(default)]
    pub boosts: Option<Boosts>,
    /// A volatile status on the user: `lockedmove` locks it into the move for 2–3 turns, like
    /// Outrage.
    #[serde(default)]
    pub volatile_status: Option<VolatileStatus>,
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
