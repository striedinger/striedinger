//! Battle content, compiled from an editable [`DexSource`] whose shape follows Pokémon
//! Showdown's data files.
//!
//! Content is referenced by name in data files and by compact numeric IDs during battle, so a
//! turn never looks up a string.

mod handlers;
mod source;

use std::collections::HashMap;
use std::fmt;
use std::hash::{BuildHasherDefault, Hasher};

use serde::{Deserialize, Serialize};

pub use handlers::{
    AbilityData, Condition, ConditionSource, Handler, HandlerMask, HandlerSource, ItemData,
};
pub use source::{
    AbilitySource, Accuracy, ClearSideConditionsSource, DexSource, ItemSource, MoveFlags,
    MoveSource, Multihit, NatureSource, ScreenSource, SecondarySource, SelfEffectSource,
    SideConditionSource, SpeciesSource, SwitchInDamageSource, TerrainSource, TypeSource,
    WeatherDefenseBoostSource, WeatherSource,
};

use crate::stats::{Boosts, MODIFIER_SCALE, Nature, Stat, StatTable};

macro_rules! id_type {
    ($(#[$meta:meta])* $name:ident($repr:ty)) => {
        $(#[$meta])*
        #[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(pub $repr);

        impl $name {
            /// Returns the ID as an index into its [`Dex`] table.
            #[must_use]
            pub fn index(self) -> usize {
                usize::from(self.0)
            }

            fn from_index(index: usize) -> Option<Self> {
                <$repr>::try_from(index).ok().map(Self)
            }
        }
    };
}

id_type!(
    /// Identifies a type within a [`Dex`].
    TypeId(u8)
);
id_type!(
    /// Identifies a weather within a [`Dex`].
    WeatherId(u8)
);
id_type!(
    /// Identifies a nature within a [`Dex`].
    NatureId(u8)
);
id_type!(
    /// Identifies a species within a [`Dex`].
    SpeciesId(u16)
);
id_type!(
    /// Identifies a move within a [`Dex`].
    MoveId(u16)
);
id_type!(
    /// Identifies an ability within a [`Dex`].
    AbilityId(u16)
);
id_type!(
    /// Identifies an item within a [`Dex`].
    ItemId(u16)
);
id_type!(
    /// Identifies a side condition within a [`Dex`].
    SideConditionId(u8)
);
id_type!(
    /// Identifies a terrain within a [`Dex`].
    TerrainId(u8)
);

/// A ratio written as `[numerator, denominator]` in data files.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "(u16, u16)", into = "(u16, u16)")]
pub struct Fraction {
    /// The numerator.
    pub numerator: u16,
    /// The denominator; never zero in a compiled [`Dex`].
    pub denominator: u16,
}

impl From<(u16, u16)> for Fraction {
    fn from((numerator, denominator): (u16, u16)) -> Self {
        Self {
            numerator,
            denominator,
        }
    }
}

impl From<Fraction> for (u16, u16) {
    fn from(fraction: Fraction) -> Self {
        (fraction.numerator, fraction.denominator)
    }
}

impl Fraction {
    /// Converts the ratio to a 4096-based modifier, truncating like Showdown.
    #[must_use]
    pub fn to_modifier(self) -> u32 {
        u32::from(self.numerator) * MODIFIER_SCALE / u32::from(self.denominator)
    }

    /// Multiplies `value` by the ratio and rounds to the nearest integer, halves up, like
    /// JavaScript's `Math.round`.
    #[must_use]
    pub fn of_rounded(self, value: u32) -> u32 {
        let numerator = u64::from(value) * u64::from(self.numerator) * 2;
        let denominator = u64::from(self.denominator) * 2;
        crate::stats::saturate_u32((numerator + u64::from(self.denominator)) / denominator)
    }

    /// Multiplies `value` by the ratio and rounds down.
    #[must_use]
    pub fn of_floored(self, value: u32) -> u32 {
        crate::stats::saturate_u32(
            u64::from(value) * u64::from(self.numerator) / u64::from(self.denominator),
        )
    }

    /// Whether `value / total` is at most this ratio, compared exactly.
    #[must_use]
    pub fn covers(self, value: u16, total: u16) -> bool {
        u32::from(value) * u32::from(self.denominator)
            <= u32::from(total) * u32::from(self.numerator)
    }
}

/// A non-volatile status, written with Showdown's IDs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Status {
    /// Burn: halves physical damage and deals 1/16 max HP each turn.
    #[serde(rename = "brn")]
    Burn,
    /// Paralysis: halves speed and prevents moving 25% of the time.
    #[serde(rename = "par")]
    Paralysis,
    /// Poison: deals 1/8 max HP each turn.
    #[serde(rename = "psn")]
    Poison,
    /// Bad poison: deals escalating damage each turn, starting at 1/16 max HP.
    #[serde(rename = "tox")]
    Toxic,
    /// Sleep: prevents moving for one to three turns.
    #[serde(rename = "slp")]
    Sleep,
    /// Freeze: prevents moving until thawed, with a 20% chance each turn.
    #[serde(rename = "frz")]
    Freeze,
}

impl Status {
    /// Every status.
    pub const ALL: [Self; 6] = [
        Self::Burn,
        Self::Paralysis,
        Self::Poison,
        Self::Toxic,
        Self::Sleep,
        Self::Freeze,
    ];

    /// Showdown's ID for the status.
    #[must_use]
    pub fn id(self) -> &'static str {
        match self {
            Self::Burn => "brn",
            Self::Paralysis => "par",
            Self::Poison => "psn",
            Self::Toxic => "tox",
            Self::Sleep => "slp",
            Self::Freeze => "frz",
        }
    }
}

/// A volatile status: cleared on switching out.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum VolatileStatus {
    /// Confusion: 2–5 move attempts, each with a 33% chance of hitting itself.
    Confusion,
    /// Flinch: cannot move for the rest of the turn.
    Flinch,
    /// Protect: moves with the `protect` flag fail against it for the rest of the turn.
    Protect,
    /// Substitute: the user pays 1/4 of its max HP for a decoy with that much HP that takes
    /// hits in its place.
    Substitute,
    /// Locked move: the user repeats the move for 2–3 turns, then becomes confused, like
    /// Outrage.
    #[serde(rename = "lockedmove")]
    LockedMove,
}

/// A move's category.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum MoveCategory {
    /// Uses Attack against Defense.
    Physical,
    /// Uses Special Attack against Special Defense.
    Special,
    /// Deals no direct damage.
    Status,
}

/// Who a move is aimed at, with Showdown's names.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum MoveTarget {
    /// `normal`: the opposing active creature. Subject to immunity and accuracy checks.
    #[default]
    #[serde(rename = "normal")]
    Normal,
    /// `self`: the user. Never misses.
    #[serde(rename = "self")]
    User,
    /// `foeSide`: the opposing side, for entry hazards.
    #[serde(rename = "foeSide")]
    FoeSide,
    /// `allySide`: the user's side, for screens.
    #[serde(rename = "allySide")]
    AllySide,
}

/// How many times a move strikes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HitRange {
    /// The fewest hits.
    pub min: u8,
    /// The most hits.
    pub max: u8,
}

/// Damage a move's user takes after hitting.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Recoil {
    /// A fraction of the damage dealt, rounded (Showdown's `recoil`).
    DamageDealt(Fraction),
    /// A quarter of the user's max HP, rounded (Showdown's `struggleRecoil`).
    Struggle,
}

/// Effects applied to a move's target: its primary effects, or a secondary's.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct MoveEffect {
    /// Stat stages applied to the target.
    pub boosts: Option<Boosts>,
    /// Status inflicted on the target.
    pub status: Option<Status>,
    /// Volatile status inflicted on the target.
    pub volatile_status: Option<VolatileStatus>,
}

/// A chance-based effect. Each secondary consumes one roll even when its chance is 100%.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Secondary {
    /// Percent chance; `None` always applies.
    pub chance: Option<u8>,
    /// Effects on the target.
    pub effect: MoveEffect,
    /// Stat stages applied to the user.
    pub self_boosts: Option<Boosts>,
}

/// A compiled type.
#[derive(Clone, Debug)]
pub struct TypeData {
    /// Display name.
    pub name: String,
    /// Statuses creatures of this type cannot receive.
    pub status_immunities: Vec<Status>,
    /// Weathers whose residual damage this type ignores.
    pub weather_immunities: Vec<WeatherId>,
    /// Whether this type's damaging moves thaw a frozen target.
    pub thaws_frozen_targets: bool,
}

/// A compiled weather.
#[derive(Clone, Debug)]
pub struct WeatherData {
    /// Display name.
    pub name: String,
    /// Turns it lasts.
    pub duration: u8,
    /// 4096-based damage modifiers by move type.
    pub damage_modifiers: Vec<(TypeId, u32)>,
    /// Fraction of max HP dealt at the end of each turn.
    pub residual_damage: Option<Fraction>,
    /// Defensive stat boosts by type.
    pub defense_boosts: Vec<WeatherDefenseBoost>,
    /// Statuses that cannot be inflicted while it lasts.
    pub prevents_statuses: Vec<Status>,
}

/// A defensive stat boost a weather grants to one type.
#[derive(Clone, Copy, Debug)]
pub struct WeatherDefenseBoost {
    /// The type that receives the boost.
    pub type_id: TypeId,
    /// `Defense` or `SpecialDefense`.
    pub stat: Stat,
    /// The 4096-based modifier.
    pub modifier: u32,
}

/// A compiled terrain. Its effects apply only to grounded creatures.
#[derive(Clone, Debug)]
pub struct TerrainData {
    /// Display name.
    pub name: String,
    /// Turns it lasts.
    pub duration: u8,
    /// Creatures immune to this type are not grounded.
    pub grounded_type: TypeId,
    /// 4096-based base power modifiers for a grounded attacker, by move type.
    pub base_power_modifiers: Vec<(TypeId, u32)>,
    /// 4096-based base power modifiers against a grounded target, by move type.
    pub target_base_power_modifiers: Vec<(TypeId, u32)>,
    /// Fraction of max HP restored to grounded creatures each turn.
    pub residual_heal: Option<Fraction>,
    /// Statuses grounded creatures cannot receive.
    pub prevents_statuses: Vec<Status>,
    /// Volatile statuses grounded creatures cannot receive.
    pub prevents_volatiles: Vec<VolatileStatus>,
    /// Whether priority moves fail against grounded targets.
    pub blocks_priority: bool,
}

/// How a `charge` move behaves on its first turn.
#[derive(Clone, Debug, Default)]
pub struct Charge {
    /// Stat stages gained while charging.
    pub boosts: Option<Boosts>,
    /// Weathers that skip the charging turn.
    pub skipped_in: Vec<WeatherId>,
    /// Whether moves aimed at the charging user miss.
    pub semi_invulnerable: bool,
}

/// Side conditions and terrain a move removes.
#[derive(Clone, Debug, Default)]
pub struct Clears {
    /// Removed from the user's side.
    pub user: Vec<SideConditionId>,
    /// Removed from the target's side.
    pub target: Vec<SideConditionId>,
    /// Whether the terrain ends.
    pub terrain: bool,
}

impl Clears {
    /// Whether it removes anything.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.user.is_empty() && self.target.is_empty() && !self.terrain
    }
}

/// A compiled side condition.
#[derive(Clone, Debug)]
pub struct SideConditionData {
    /// Display name.
    pub name: String,
    /// Turns it lasts; `None` lasts until the battle ends.
    pub duration: Option<u8>,
    /// Damage to creatures switching in.
    pub switch_in_damage: Option<SwitchInDamage>,
    /// Damage reduction for one category.
    pub screen: Option<Screen>,
}

impl SideConditionData {
    /// How many times it can be set, stacking a layer each time.
    #[must_use]
    pub fn max_layers(&self) -> u8 {
        self.switch_in_damage.as_ref().map_or(1, |damage| {
            u8::try_from(damage.layers.len()).unwrap_or(u8::MAX)
        })
    }
}

/// A compiled hazard's switch-in damage.
#[derive(Clone, Debug)]
pub struct SwitchInDamage {
    /// Fraction of max HP by layer count, starting at one layer.
    pub layers: Vec<Fraction>,
    /// The type whose effectiveness scales the damage.
    pub type_id: Option<TypeId>,
    /// Only creatures not immune to this type take damage.
    pub grounded_type: Option<TypeId>,
}

/// A compiled screen.
#[derive(Clone, Copy, Debug)]
pub struct Screen {
    /// The category it weakens.
    pub category: MoveCategory,
    /// The 4096-based modifier for non-critical hits.
    pub modifier: u32,
}

/// A compiled nature.
#[derive(Clone, Debug)]
pub struct NatureData {
    /// Display name.
    pub name: String,
    /// The stats it changes; `None` for neutral natures.
    pub nature: Option<Nature>,
}

/// A compiled species.
#[derive(Clone, Debug)]
pub struct SpeciesData {
    /// Display name.
    pub name: String,
    /// The primary type.
    pub primary_type: TypeId,
    /// The secondary type, if any.
    pub secondary_type: Option<TypeId>,
    /// Base stats.
    pub base_stats: StatTable,
}

/// A compiled move.
#[derive(Clone, Debug)]
pub struct MoveData {
    /// Display name.
    pub name: String,
    /// The type; `None` for typeless moves.
    pub move_type: Option<TypeId>,
    /// The category.
    pub category: MoveCategory,
    /// Base power; zero for status moves.
    pub base_power: u16,
    /// Accuracy percentage; `None` never misses.
    pub accuracy: Option<u8>,
    /// Base PP before PP Ups.
    pub pp: u8,
    /// Priority bracket.
    pub priority: i8,
    /// Who it is aimed at.
    pub target: MoveTarget,
    /// Critical-hit ratio; 0 never crits.
    pub crit_ratio: u8,
    /// How many times it strikes.
    pub multihit: HitRange,
    /// Fraction of damage dealt restored to the user.
    pub drain: Option<Fraction>,
    /// Damage the user takes after hitting.
    pub recoil: Option<Recoil>,
    /// Move flags.
    pub flags: MoveFlags,
    /// Whether type immunities are ignored.
    pub ignore_immunity: bool,
    /// Effects on the target without a roll.
    pub primary: MoveEffect,
    /// Weather summoned.
    pub weather: Option<WeatherId>,
    /// Fraction of the target's max HP restored.
    pub heal: Option<Fraction>,
    /// Stat stages applied to the user after one shared roll.
    pub self_boosts: Option<Boosts>,
    /// Chance-based effects.
    pub secondaries: Vec<Secondary>,
    /// The side condition it sets.
    pub side_condition: Option<SideConditionId>,
    /// Whether it is a Protect-like stalling move.
    pub stalling_move: bool,
    /// Whether the user switches out after it works.
    pub self_switch: bool,
    /// Whether the target is dragged out after it works.
    pub force_switch: bool,
    /// The terrain it sets.
    pub terrain: Option<TerrainId>,
    /// How it charges, for `charge` moves.
    pub charge: Option<Charge>,
    /// What it removes after it works.
    pub clears: Clears,
    /// A volatile status on the user, after it works.
    pub self_volatile: Option<VolatileStatus>,
}

impl MoveData {
    /// Whether the move deals direct damage.
    #[must_use]
    pub fn is_damaging(&self) -> bool {
        self.category != MoveCategory::Status
    }
}

/// Combined type effectiveness as a power of two: `Some(1)` is ×2, `Some(-2)` is ×0.25, and
/// `None` means no effect.
pub type TypeModifier = Option<i8>;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Matchup {
    Neutral,
    SuperEffective,
    NotVeryEffective,
    NoEffect,
}

/// Compiled battle content.
#[derive(Clone, Debug)]
pub struct Dex {
    types: Vec<TypeData>,
    matchups: Vec<Matchup>,
    weathers: Vec<WeatherData>,
    natures: Vec<NatureData>,
    species: Vec<SpeciesData>,
    moves: Vec<MoveData>,
    abilities: Vec<AbilityData>,
    items: Vec<ItemData>,
    side_conditions: Vec<SideConditionData>,
    terrains: Vec<TerrainData>,
    type_ids: NameMap<TypeId>,
    weather_ids: NameMap<WeatherId>,
    nature_ids: NameMap<NatureId>,
    species_ids: NameMap<SpeciesId>,
    move_ids: NameMap<MoveId>,
    ability_ids: NameMap<AbilityId>,
    item_ids: NameMap<ItemId>,
    side_condition_ids: NameMap<SideConditionId>,
    terrain_ids: NameMap<TerrainId>,
    struggle: MoveId,
}

/// The 64-bit FNV-1a hash: much cheaper than the default hasher for short name keys, which
/// come from trusted content packs.
#[derive(Clone, Copy, Debug)]
struct FnvHasher(u64);

impl Default for FnvHasher {
    fn default() -> Self {
        Self(0xcbf2_9ce4_8422_2325)
    }
}

impl Hasher for FnvHasher {
    fn finish(&self) -> u64 {
        self.0
    }

    fn write(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            self.0 = (self.0 ^ u64::from(byte)).wrapping_mul(0x0100_0000_01b3);
        }
    }
}

type NameMap<Id> = HashMap<String, Id, BuildHasherDefault<FnvHasher>>;

/// The longest name, after normalization, that is looked up without allocating.
const INLINE_ID_LENGTH: usize = 64;

/// Looks `name` up by its normalized ID, normalizing into a stack buffer when it fits.
fn lookup<Id: Copy>(ids: &NameMap<Id>, name: &str) -> Option<Id> {
    let mut buffer = [0_u8; INLINE_ID_LENGTH];
    let mut length = 0;
    for byte in name.bytes().filter(u8::is_ascii_alphanumeric) {
        if length == INLINE_ID_LENGTH {
            return ids.get(&to_id(name)).copied();
        }
        buffer[length] = byte.to_ascii_lowercase();
        length += 1;
    }
    let key = std::str::from_utf8(&buffer[..length]).ok()?;
    ids.get(key).copied()
}

/// Normalizes a display name into a lookup key the way Showdown's `toID` does: lowercase
/// letters and digits only.
#[must_use]
pub fn to_id(name: &str) -> String {
    name.chars()
        .filter(char::is_ascii_alphanumeric)
        .map(|character| character.to_ascii_lowercase())
        .collect()
}

impl Dex {
    /// Parses and compiles a content pack from JSON.
    ///
    /// # Errors
    ///
    /// Returns an error if the JSON is malformed or the content is invalid.
    pub fn from_json(json: &str) -> Result<Self, DexError> {
        let source: DexSource = serde_json::from_str(json).map_err(DexError::Json)?;
        Self::from_source(&source)
    }

    /// Compiles a content pack, resolving names and validating every entry.
    ///
    /// # Errors
    ///
    /// Returns an error for duplicate names, unknown references, or impossible values.
    pub fn from_source(source: &DexSource) -> Result<Self, DexError> {
        let mut dex = Self {
            types: Vec::new(),
            matchups: Vec::new(),
            weathers: Vec::new(),
            natures: Vec::new(),
            species: Vec::new(),
            moves: Vec::new(),
            abilities: Vec::new(),
            items: Vec::new(),
            side_conditions: Vec::new(),
            terrains: Vec::new(),
            type_ids: NameMap::default(),
            weather_ids: NameMap::default(),
            nature_ids: NameMap::default(),
            species_ids: NameMap::default(),
            move_ids: NameMap::default(),
            ability_ids: NameMap::default(),
            item_ids: NameMap::default(),
            side_condition_ids: NameMap::default(),
            terrain_ids: NameMap::default(),
            struggle: MoveId(0),
        };
        for type_source in &source.types {
            let id = TypeId::from_index(dex.type_ids.len()).ok_or(DexError::TooMany("types"))?;
            insert_unique(&mut dex.type_ids, "type", &type_source.name, id)?;
        }
        for weather in &source.weathers {
            dex.compile_weather(weather)?;
        }
        dex.compile_type_chart(&source.types)?;
        for nature in &source.natures {
            dex.compile_nature(nature)?;
        }
        for species in &source.species {
            dex.compile_species(species)?;
        }
        for condition in &source.side_conditions {
            dex.compile_side_condition(condition)?;
        }
        for terrain in &source.terrains {
            dex.compile_terrain(terrain)?;
        }
        for move_source in &source.moves {
            dex.compile_move(move_source)?;
        }
        dex.struggle = match dex.move_ids.get("struggle") {
            Some(&id) => id,
            None => dex.compile_move(&built_in_struggle())?,
        };
        for ability in &source.abilities {
            let id =
                AbilityId::from_index(dex.abilities.len()).ok_or(DexError::TooMany("abilities"))?;
            insert_unique(&mut dex.ability_ids, "ability", &ability.name, id)?;
            let (handlers, mask) = dex.compile_handlers(&ability.handlers, &ability.name)?;
            dex.abilities.push(AbilityData {
                name: ability.name.clone(),
                handlers,
                mask,
            });
        }
        for item in &source.items {
            let id = ItemId::from_index(dex.items.len()).ok_or(DexError::TooMany("items"))?;
            insert_unique(&mut dex.item_ids, "item", &item.name, id)?;
            let (handlers, mask) = dex.compile_handlers(&item.handlers, &item.name)?;
            dex.items.push(ItemData {
                name: item.name.clone(),
                consumable: item.consumable,
                handlers,
                mask,
            });
        }
        Ok(dex)
    }

    /// Builds the attacker-by-defender matchup table and immunities from each type's
    /// `damageTaken`, which may also list status IDs and weather names.
    fn compile_type_chart(&mut self, sources: &[TypeSource]) -> Result<(), DexError> {
        let count = sources.len();
        self.matchups = vec![Matchup::Neutral; count * count];
        for (defender, source) in sources.iter().enumerate() {
            let mut status_immunities = Vec::new();
            let mut weather_immunities = Vec::new();
            for (key, &code) in &source.damage_taken {
                if code > 3 {
                    return Err(DexError::invalid(
                        &source.name,
                        format!("damageTaken {key} must be 0, 1, 2, or 3"),
                    ));
                }
                if let Some(attacker) = lookup(&self.type_ids, key) {
                    self.matchups[attacker.index() * count + defender] = match code {
                        1 => Matchup::SuperEffective,
                        2 => Matchup::NotVeryEffective,
                        3 => Matchup::NoEffect,
                        _ => Matchup::Neutral,
                    };
                } else if let Some(status) =
                    Status::ALL.into_iter().find(|status| status.id() == key)
                {
                    if code == 3 {
                        status_immunities.push(status);
                    }
                } else if let Some(weather) = lookup(&self.weather_ids, key) {
                    if code == 3 {
                        weather_immunities.push(weather);
                    }
                } else {
                    return Err(DexError::UnknownReference {
                        kind: "type, status, or weather",
                        name: key.clone(),
                        referenced_by: source.name.clone(),
                    });
                }
            }
            self.types.push(TypeData {
                name: source.name.clone(),
                status_immunities,
                weather_immunities,
                thaws_frozen_targets: source.thaws_frozen_targets,
            });
        }
        Ok(())
    }

    fn compile_weather(&mut self, source: &WeatherSource) -> Result<(), DexError> {
        let id = WeatherId::from_index(self.weathers.len()).ok_or(DexError::TooMany("weathers"))?;
        insert_unique(&mut self.weather_ids, "weather", &source.name, id)?;
        if source.duration == 0 {
            return Err(DexError::invalid(
                &source.name,
                "must last at least one turn",
            ));
        }
        let damage_modifiers = source
            .damage_modifiers
            .iter()
            .map(|(type_name, &modifier)| {
                Ok((
                    self.resolve_type(type_name, &source.name)?,
                    validate_fraction(modifier, &source.name)?.to_modifier(),
                ))
            })
            .collect::<Result<_, DexError>>()?;
        if let Some(fraction) = source.residual_damage {
            validate_fraction(fraction, &source.name)?;
        }
        let defense_boosts = source
            .defense_boosts
            .iter()
            .map(|boost| {
                if !matches!(boost.stat, Stat::Defense | Stat::SpecialDefense) {
                    return Err(DexError::invalid(&source.name, "can only boost def or spd"));
                }
                Ok(WeatherDefenseBoost {
                    type_id: self.resolve_type(&boost.type_name, &source.name)?,
                    stat: boost.stat,
                    modifier: validate_fraction(boost.modifier, &source.name)?.to_modifier(),
                })
            })
            .collect::<Result<_, _>>()?;
        self.weathers.push(WeatherData {
            name: source.name.clone(),
            duration: source.duration,
            damage_modifiers,
            residual_damage: source.residual_damage,
            defense_boosts,
            prevents_statuses: source.prevents_statuses.clone(),
        });
        Ok(())
    }

    fn compile_terrain(&mut self, source: &TerrainSource) -> Result<(), DexError> {
        let id = TerrainId::from_index(self.terrains.len()).ok_or(DexError::TooMany("terrains"))?;
        insert_unique(&mut self.terrain_ids, "terrain", &source.name, id)?;
        let name = source.name.as_str();
        if source.duration == 0 {
            return Err(DexError::invalid(name, "must last at least one turn"));
        }
        let modifiers = |table: &std::collections::BTreeMap<String, Fraction>| {
            table
                .iter()
                .map(|(type_name, &modifier)| {
                    Ok((
                        self.resolve_type(type_name, name)?,
                        validate_fraction(modifier, name)?.to_modifier(),
                    ))
                })
                .collect::<Result<Vec<_>, DexError>>()
        };
        let terrain = TerrainData {
            name: source.name.clone(),
            duration: source.duration,
            grounded_type: self.resolve_type(&source.grounded_type, name)?,
            base_power_modifiers: modifiers(&source.base_power_modifiers)?,
            target_base_power_modifiers: modifiers(&source.target_base_power_modifiers)?,
            residual_heal: source
                .residual_heal
                .map(|fraction| validate_fraction(fraction, name))
                .transpose()?,
            prevents_statuses: source.prevents_statuses.clone(),
            prevents_volatiles: source.prevents_volatiles.clone(),
            blocks_priority: source.blocks_priority,
        };
        self.terrains.push(terrain);
        Ok(())
    }

    fn compile_side_condition(&mut self, source: &SideConditionSource) -> Result<(), DexError> {
        let id = SideConditionId::from_index(self.side_conditions.len())
            .ok_or(DexError::TooMany("side conditions"))?;
        insert_unique(
            &mut self.side_condition_ids,
            "side condition",
            &source.name,
            id,
        )?;
        let name = source.name.as_str();
        if source.duration == Some(0) {
            return Err(DexError::invalid(name, "must last at least one turn"));
        }
        let switch_in_damage = match &source.switch_in_damage {
            None => None,
            Some(damage) => {
                if damage.layers.is_empty() {
                    return Err(DexError::invalid(
                        name,
                        "switchInDamage needs at least one layer",
                    ));
                }
                for &fraction in &damage.layers {
                    validate_fraction(fraction, name)?;
                }
                let resolve = |type_name: Option<&str>| {
                    type_name
                        .map(|type_name| self.resolve_type(type_name, name))
                        .transpose()
                };
                Some(SwitchInDamage {
                    layers: damage.layers.clone(),
                    type_id: resolve(damage.type_name.as_deref())?,
                    grounded_type: resolve(damage.grounded_type.as_deref())?,
                })
            }
        };
        let screen = match &source.damage_modifier {
            None => None,
            Some(screen) => Some(Screen {
                category: screen.category,
                modifier: validate_fraction(screen.modifier, name)?.to_modifier(),
            }),
        };
        self.side_conditions.push(SideConditionData {
            name: source.name.clone(),
            duration: source.duration,
            switch_in_damage,
            screen,
        });
        Ok(())
    }

    fn compile_nature(&mut self, source: &NatureSource) -> Result<(), DexError> {
        let id = NatureId::from_index(self.natures.len()).ok_or(DexError::TooMany("natures"))?;
        insert_unique(&mut self.nature_ids, "nature", &source.name, id)?;
        let nature = match (source.plus, source.minus) {
            (None, None) => None,
            (Some(plus), Some(minus)) if plus == minus => None,
            (Some(plus), Some(minus)) if plus != Stat::Hp && minus != Stat::Hp => {
                Some(Nature { plus, minus })
            }
            _ => {
                return Err(DexError::invalid(
                    &source.name,
                    "needs both plus and minus (not HP), or neither",
                ));
            }
        };
        self.natures.push(NatureData {
            name: source.name.clone(),
            nature,
        });
        Ok(())
    }

    fn compile_species(&mut self, source: &SpeciesSource) -> Result<(), DexError> {
        let id = SpeciesId::from_index(self.species.len()).ok_or(DexError::TooMany("species"))?;
        insert_unique(&mut self.species_ids, "species", &source.name, id)?;
        let types = source
            .types
            .iter()
            .map(|type_name| self.resolve_type(type_name, &source.name))
            .collect::<Result<Vec<_>, _>>()?;
        let (primary_type, secondary_type) = match types.as_slice() {
            [primary] => (*primary, None),
            [primary, secondary] if primary != secondary => (*primary, Some(*secondary)),
            _ => {
                return Err(DexError::invalid(
                    &source.name,
                    "must have one type or two different types",
                ));
            }
        };
        if source.base_stats.min() == 0 {
            return Err(DexError::invalid(
                &source.name,
                "every base stat must be at least 1",
            ));
        }
        self.species.push(SpeciesData {
            name: source.name.clone(),
            primary_type,
            secondary_type,
            base_stats: source.base_stats,
        });
        Ok(())
    }

    fn compile_move(&mut self, source: &MoveSource) -> Result<MoveId, DexError> {
        let id = MoveId::from_index(self.moves.len()).ok_or(DexError::TooMany("moves"))?;
        insert_unique(&mut self.move_ids, "move", &source.name, id)?;
        let name = source.name.as_str();
        let move_type = match source.type_name.as_deref() {
            None | Some("???") => None,
            Some(type_name) => Some(self.resolve_type(type_name, name)?),
        };
        let damaging = source.category != MoveCategory::Status;
        let multihit = validate_move_shape(source)?;
        let primary = MoveEffect {
            boosts: validate_boosts(source.boosts, name)?,
            status: source.status,
            volatile_status: source.volatile_status,
        };
        let weather = source
            .weather
            .as_deref()
            .map(|weather_name| self.resolve_weather(weather_name, name))
            .transpose()?;
        let secondaries = source
            .secondaries
            .iter()
            .map(|secondary| compile_secondary(secondary, name))
            .collect::<Result<_, DexError>>()?;
        let self_boosts = validate_boosts(
            source.self_effect.as_ref().and_then(|effect| effect.boosts),
            name,
        )?;
        self.moves.push(MoveData {
            name: source.name.clone(),
            move_type,
            category: source.category,
            base_power: source.base_power,
            accuracy: source.accuracy.0,
            pp: source.pp,
            priority: source.priority,
            target: source.target,
            crit_ratio: source.crit_ratio,
            multihit,
            drain: source.drain,
            recoil: if source.struggle_recoil {
                Some(Recoil::Struggle)
            } else {
                source.recoil.map(Recoil::DamageDealt)
            },
            flags: source.flags,
            ignore_immunity: source.ignore_immunity.unwrap_or(!damaging),
            primary,
            weather,
            heal: source.heal,
            self_boosts,
            secondaries,
            side_condition: source
                .side_condition
                .as_deref()
                .map(|condition| {
                    resolve(&self.side_condition_ids, "side condition", condition, name)
                })
                .transpose()?,
            stalling_move: source.stalling_move,
            self_switch: source.self_switch,
            force_switch: source.force_switch,
            terrain: source
                .terrain
                .as_deref()
                .map(|terrain| resolve(&self.terrain_ids, "terrain", terrain, name))
                .transpose()?,
            charge: if source.flags.charge {
                Some(Charge {
                    boosts: validate_boosts(source.charge_boosts, name)?,
                    skipped_in: source
                        .charge_skipped_in
                        .iter()
                        .map(|weather| self.resolve_weather(weather, name))
                        .collect::<Result<_, _>>()?,
                    semi_invulnerable: source.semi_invulnerable,
                })
            } else {
                None
            },
            clears: self.compile_clears(source)?,
            self_volatile: source
                .self_effect
                .as_ref()
                .and_then(|effect| effect.volatile_status),
        });
        Ok(id)
    }

    fn compile_clears(&self, source: &MoveSource) -> Result<Clears, DexError> {
        let names = |names: &[String]| {
            names
                .iter()
                .map(|condition| {
                    resolve(
                        &self.side_condition_ids,
                        "side condition",
                        condition,
                        &source.name,
                    )
                })
                .collect::<Result<Vec<_>, _>>()
        };
        let lists = source.clear_side_conditions.clone().unwrap_or_default();
        Ok(Clears {
            user: names(&lists.user)?,
            target: names(&lists.target)?,
            terrain: source.clear_terrain,
        })
    }

    fn resolve_type(&self, name: &str, referenced_by: &str) -> Result<TypeId, DexError> {
        resolve(&self.type_ids, "type", name, referenced_by)
    }

    fn resolve_weather(&self, name: &str, referenced_by: &str) -> Result<WeatherId, DexError> {
        resolve(&self.weather_ids, "weather", name, referenced_by)
    }

    /// Returns a type. Panics if the ID is not from this dex.
    #[must_use]
    pub fn type_data(&self, id: TypeId) -> &TypeData {
        &self.types[id.index()]
    }

    /// Returns a weather. Panics if the ID is not from this dex.
    #[must_use]
    pub fn weather(&self, id: WeatherId) -> &WeatherData {
        &self.weathers[id.index()]
    }

    /// Returns a nature. Panics if the ID is not from this dex.
    #[must_use]
    pub fn nature(&self, id: NatureId) -> &NatureData {
        &self.natures[id.index()]
    }

    /// Returns a species. Panics if the ID is not from this dex.
    #[must_use]
    pub fn species(&self, id: SpeciesId) -> &SpeciesData {
        &self.species[id.index()]
    }

    /// Returns a move. Panics if the ID is not from this dex.
    #[must_use]
    pub fn move_data(&self, id: MoveId) -> &MoveData {
        &self.moves[id.index()]
    }

    /// Returns a terrain. Panics if the ID is not from this dex.
    #[must_use]
    pub fn terrain(&self, id: TerrainId) -> &TerrainData {
        &self.terrains[id.index()]
    }

    /// Looks up a terrain by name.
    #[must_use]
    pub fn terrain_id(&self, name: &str) -> Option<TerrainId> {
        lookup(&self.terrain_ids, name)
    }

    /// The number of terrains.
    #[must_use]
    pub fn terrain_count(&self) -> usize {
        self.terrains.len()
    }

    /// Returns a side condition. Panics if the ID is not from this dex.
    #[must_use]
    pub fn side_condition(&self, id: SideConditionId) -> &SideConditionData {
        &self.side_conditions[id.index()]
    }

    /// Looks up a side condition by name.
    #[must_use]
    pub fn side_condition_id(&self, name: &str) -> Option<SideConditionId> {
        lookup(&self.side_condition_ids, name)
    }

    /// The number of side conditions.
    #[must_use]
    pub fn side_condition_count(&self) -> usize {
        self.side_conditions.len()
    }

    /// Returns an ability. Panics if the ID is not from this dex.
    #[must_use]
    pub fn ability(&self, id: AbilityId) -> &AbilityData {
        &self.abilities[id.index()]
    }

    /// Returns an item. Panics if the ID is not from this dex.
    #[must_use]
    pub fn item(&self, id: ItemId) -> &ItemData {
        &self.items[id.index()]
    }

    /// Looks up a type by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn type_id(&self, name: &str) -> Option<TypeId> {
        lookup(&self.type_ids, name)
    }

    /// Looks up a weather by name.
    #[must_use]
    pub fn weather_id(&self, name: &str) -> Option<WeatherId> {
        lookup(&self.weather_ids, name)
    }

    /// Looks up a nature by name.
    #[must_use]
    pub fn nature_id(&self, name: &str) -> Option<NatureId> {
        lookup(&self.nature_ids, name)
    }

    /// Looks up a species by name.
    #[must_use]
    pub fn species_id(&self, name: &str) -> Option<SpeciesId> {
        lookup(&self.species_ids, name)
    }

    /// Looks up a move by name.
    #[must_use]
    pub fn move_id(&self, name: &str) -> Option<MoveId> {
        lookup(&self.move_ids, name)
    }

    /// Looks up an ability by name.
    #[must_use]
    pub fn ability_id(&self, name: &str) -> Option<AbilityId> {
        lookup(&self.ability_ids, name)
    }

    /// Looks up an item by name.
    #[must_use]
    pub fn item_id(&self, name: &str) -> Option<ItemId> {
        lookup(&self.item_ids, name)
    }

    /// The move used when nothing else can be selected.
    #[must_use]
    pub fn struggle(&self) -> MoveId {
        self.struggle
    }

    /// The number of types.
    #[must_use]
    pub fn type_count(&self) -> usize {
        self.types.len()
    }

    /// The number of weathers.
    #[must_use]
    pub fn weather_count(&self) -> usize {
        self.weathers.len()
    }

    /// The number of natures.
    #[must_use]
    pub fn nature_count(&self) -> usize {
        self.natures.len()
    }

    /// The number of species.
    #[must_use]
    pub fn species_count(&self) -> usize {
        self.species.len()
    }

    /// The number of moves, including Struggle.
    #[must_use]
    pub fn move_count(&self) -> usize {
        self.moves.len()
    }

    /// The number of abilities.
    #[must_use]
    pub fn ability_count(&self) -> usize {
        self.abilities.len()
    }

    /// The number of items.
    #[must_use]
    pub fn item_count(&self) -> usize {
        self.items.len()
    }

    /// Combines an attacking type's matchups against every defending type.
    #[must_use]
    pub fn type_modifier(
        &self,
        attacking: TypeId,
        defending: impl IntoIterator<Item = TypeId>,
    ) -> TypeModifier {
        let mut modifier = 0;
        for defender in defending {
            match self.matchups[attacking.index() * self.types.len() + defender.index()] {
                Matchup::Neutral => {}
                Matchup::SuperEffective => modifier += 1,
                Matchup::NotVeryEffective => modifier -= 1,
                Matchup::NoEffect => return None,
            }
        }
        Some(modifier)
    }
}

fn built_in_struggle() -> MoveSource {
    MoveSource {
        name: "Struggle".to_owned(),
        type_name: None,
        category: MoveCategory::Physical,
        base_power: 50,
        accuracy: Accuracy(None),
        pp: 1,
        priority: 0,
        target: MoveTarget::Normal,
        crit_ratio: 1,
        multihit: None,
        drain: None,
        recoil: None,
        struggle_recoil: true,
        flags: MoveFlags {
            contact: true,
            protect: true,
            charge: false,
            bypasssub: false,
        },
        ignore_immunity: None,
        boosts: None,
        status: None,
        volatile_status: None,
        weather: None,
        heal: None,
        self_effect: None,
        secondaries: Vec::new(),
        side_condition: None,
        stalling_move: false,
        self_switch: false,
        force_switch: false,
        terrain: None,
        charge_boosts: None,
        charge_skipped_in: Vec::new(),
        semi_invulnerable: false,
        clear_side_conditions: None,
        clear_terrain: false,
    }
}

/// Checks a move's fields fit its category and returns its hit range.
fn validate_move_shape(source: &MoveSource) -> Result<HitRange, DexError> {
    let name = source.name.as_str();
    let damaging = source.category != MoveCategory::Status;
    let self_volatile = source
        .self_effect
        .as_ref()
        .and_then(|effect| effect.volatile_status);
    if self_volatile.is_some_and(|volatile| volatile != VolatileStatus::LockedMove)
        || (self_volatile.is_some() && !damaging)
    {
        return Err(DexError::invalid(
            name,
            "self.volatileStatus supports only lockedmove, on damaging moves",
        ));
    }
    let charge_only = source.charge_boosts.is_some()
        || !source.charge_skipped_in.is_empty()
        || source.semi_invulnerable;
    if charge_only && !source.flags.charge {
        return Err(DexError::invalid(
            name,
            "chargeBoosts, chargeSkippedIn, and semiInvulnerable need flags.charge",
        ));
    }
    if source.flags.charge && !damaging {
        return Err(DexError::invalid(
            name,
            "flags.charge needs a damaging move",
        ));
    }
    let targets_side = matches!(source.target, MoveTarget::FoeSide | MoveTarget::AllySide);
    if targets_side != source.side_condition.is_some() || (targets_side && damaging) {
        return Err(DexError::invalid(
            name,
            "a sideCondition needs a foeSide or allySide status move, and those need one",
        ));
    }
    if damaging && source.base_power == 0 {
        return Err(DexError::invalid(name, "damaging moves need basePower"));
    }
    if !damaging
        && (source.base_power > 0
            || source.multihit.is_some()
            || source.drain.is_some()
            || source.recoil.is_some()
            || source.struggle_recoil)
    {
        return Err(DexError::invalid(
            name,
            "status moves cannot have basePower, multihit, drain, or recoil",
        ));
    }
    if source.pp == 0 {
        return Err(DexError::invalid(name, "needs at least 1 PP"));
    }
    if source
        .accuracy
        .0
        .is_some_and(|accuracy| accuracy == 0 || accuracy > 100)
    {
        return Err(DexError::invalid(
            name,
            "accuracy must be true or between 1 and 100",
        ));
    }
    let multihit = match source.multihit {
        None => HitRange { min: 1, max: 1 },
        Some(Multihit::Fixed(hits)) => HitRange {
            min: hits,
            max: hits,
        },
        Some(Multihit::Range(min, max)) => HitRange { min, max },
    };
    if multihit.min == 0 || multihit.min > multihit.max {
        return Err(DexError::invalid(
            name,
            "multihit must be a count or [min, max] with 1 <= min <= max",
        ));
    }
    for fraction in [source.drain, source.recoil, source.heal]
        .into_iter()
        .flatten()
    {
        validate_fraction(fraction, name)?;
    }
    Ok(multihit)
}

fn compile_secondary(secondary: &SecondarySource, owner: &str) -> Result<Secondary, DexError> {
    handlers::validate_chance(secondary.chance, owner)?;
    Ok(Secondary {
        chance: secondary.chance,
        effect: MoveEffect {
            boosts: validate_boosts(secondary.boosts, owner)?,
            status: secondary.status,
            volatile_status: secondary.volatile_status,
        },
        self_boosts: validate_boosts(
            secondary
                .self_effect
                .as_ref()
                .and_then(|effect| effect.boosts),
            owner,
        )?,
    })
}

fn validate_boosts(boosts: Option<Boosts>, owner: &str) -> Result<Option<Boosts>, DexError> {
    match boosts {
        Some(boosts) if boosts.is_empty() => Err(DexError::invalid(
            owner,
            "boosts need at least one non-zero stage",
        )),
        other => Ok(other),
    }
}

fn validate_fraction(fraction: Fraction, owner: &str) -> Result<Fraction, DexError> {
    if fraction.denominator == 0 || fraction.numerator == 0 {
        return Err(DexError::invalid(
            owner,
            "fractions need a non-zero numerator and denominator",
        ));
    }
    Ok(fraction)
}

fn resolve<Id: Copy>(
    ids: &NameMap<Id>,
    kind: &'static str,
    name: &str,
    referenced_by: &str,
) -> Result<Id, DexError> {
    lookup(ids, name).ok_or_else(|| DexError::UnknownReference {
        kind,
        name: name.to_owned(),
        referenced_by: referenced_by.to_owned(),
    })
}

fn insert_unique<Id: Copy>(
    ids: &mut NameMap<Id>,
    kind: &'static str,
    name: &str,
    id: Id,
) -> Result<(), DexError> {
    let key = to_id(name);
    if key.is_empty() {
        return Err(DexError::invalid(
            name,
            "names need at least one letter or digit",
        ));
    }
    if ids.insert(key, id).is_some() {
        return Err(DexError::DuplicateName {
            kind,
            name: name.to_owned(),
        });
    }
    Ok(())
}

/// Why a content pack could not be compiled.
#[derive(Debug)]
pub enum DexError {
    /// The JSON could not be parsed into a [`DexSource`].
    Json(serde_json::Error),
    /// Two entries of the same kind normalize to the same name.
    DuplicateName {
        /// The kind of entry.
        kind: &'static str,
        /// The duplicated name.
        name: String,
    },
    /// An entry references a name that does not exist.
    UnknownReference {
        /// The kind of entry being referenced.
        kind: &'static str,
        /// The missing name.
        name: String,
        /// The entry containing the reference.
        referenced_by: String,
    },
    /// An entry has an impossible value.
    InvalidValue {
        /// The entry.
        entry: String,
        /// What is wrong.
        reason: String,
    },
    /// There are more entries of a kind than its ID can address.
    TooMany(&'static str),
}

impl DexError {
    fn invalid(entry: &str, reason: impl Into<String>) -> Self {
        Self::InvalidValue {
            entry: entry.to_owned(),
            reason: reason.into(),
        }
    }
}

impl fmt::Display for DexError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Json(error) => write!(formatter, "invalid content JSON: {error}"),
            Self::DuplicateName { kind, name } => {
                write!(formatter, "the {kind} name {name:?} is used more than once")
            }
            Self::UnknownReference {
                kind,
                name,
                referenced_by,
            } => write!(
                formatter,
                "{referenced_by:?} references unknown {kind} {name:?}"
            ),
            Self::InvalidValue { entry, reason } => write!(formatter, "{entry:?} {reason}"),
            Self::TooMany(kind) => write!(formatter, "there are too many {kind}"),
        }
    }
}

impl std::error::Error for DexError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Json(error) => Some(error),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Dex, DexError, Status};

    fn sample() -> Dex {
        Dex::from_json(crate::SAMPLE_DEX_JSON).expect("the sample dex compiles")
    }

    #[test]
    fn combines_matchups_across_both_defending_types() {
        let dex = sample();
        let id = |name| dex.type_id(name).expect("the type exists");
        assert_eq!(
            dex.type_modifier(id("Fire"), [id("Bug"), id("Steel")]),
            Some(2)
        );
        assert_eq!(
            dex.type_modifier(id("Water"), [id("Water"), id("Dragon")]),
            Some(-2)
        );
        assert_eq!(
            dex.type_modifier(id("Electric"), [id("Water"), id("Ground")]),
            None
        );
    }

    #[test]
    fn reads_status_and_weather_immunities_from_damage_taken() {
        let dex = sample();
        let fire = dex.type_data(dex.type_id("Fire").expect("Fire exists"));
        assert_eq!(fire.status_immunities, [Status::Burn]);
        let rock = dex.type_data(dex.type_id("Rock").expect("Rock exists"));
        let sandstorm = dex
            .weather_id("Sandstorm")
            .expect("the sample has sandstorm");
        assert_eq!(rock.weather_immunities, [sandstorm]);
    }

    #[test]
    fn looks_up_names_ignoring_case_and_punctuation() {
        let dex = sample();
        assert_eq!(dex.move_id("swift-strike"), dex.move_id("Swift Strike"));
        assert!(dex.species_id("CINDERCUB").is_some());
        assert_eq!(dex.move_data(dex.struggle()).name, "Struggle");
    }

    #[test]
    fn rejects_references_to_unknown_content() {
        let error = Dex::from_json(
            r#"{"types":[{"name":"Fire"}],"species":[{"name":"Blob","types":["Water"],
            "baseStats":{"hp":1,"atk":1,"def":1,"spa":1,"spd":1,"spe":1}}],"moves":[]}"#,
        )
        .unwrap_err();
        assert!(matches!(
            error,
            DexError::UnknownReference { kind: "type", .. }
        ));
    }

    #[test]
    fn rejects_names_that_collide_after_normalization() {
        let error = Dex::from_json(
            r#"{"types":[{"name":"Fire"},{"name":"fire"}],"species":[],"moves":[]}"#,
        )
        .unwrap_err();
        assert!(matches!(
            error,
            DexError::DuplicateName { kind: "type", .. }
        ));
    }

    #[test]
    fn rejects_status_moves_with_base_power() {
        let error = Dex::from_json(
            r#"{"types":[{"name":"Fire"}],"species":[],"moves":[{"name":"Glow",
            "type":"Fire","category":"Status","basePower":40,"accuracy":true,"pp":10}]}"#,
        )
        .unwrap_err();
        assert!(matches!(error, DexError::InvalidValue { .. }));
    }

    #[test]
    fn rejects_misspelled_fields() {
        let error = Dex::from_json(
            r#"{"types":[{"name":"Fire","damageTakn":{}}],"species":[],"moves":[]}"#,
        )
        .unwrap_err();
        assert!(matches!(error, DexError::Json(_)));
    }
}
