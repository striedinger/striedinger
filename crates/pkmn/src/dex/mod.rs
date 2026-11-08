//! Battle content: types, weather, species, and moves, compiled from an editable [`DexSource`].
//!
//! Content is referenced by name in data files and by compact numeric IDs during battle, so a
//! turn never looks up a string.

mod source;
mod traits;

use std::collections::HashMap;
use std::fmt;

use serde::{Deserialize, Serialize};

pub use source::{
    DexSource, EffectSource, MoveEffectSource, MoveSource, SpeciesSource, TypeSource,
    WeatherDefenseBoostSource, WeatherSource,
};
pub use traits::{
    BoostSource, Condition, ConditionSource, TraitData, TraitEffect, TraitEffectSource, TraitSource,
};

use crate::stats::{BoostStat, MODIFIER_SCALE, Stat, StatTable};

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
    /// Identifies a species within a [`Dex`].
    SpeciesId(u16)
);
id_type!(
    /// Identifies a move within a [`Dex`].
    MoveId(u16)
);
id_type!(
    /// Identifies a weather within a [`Dex`].
    WeatherId(u8)
);
id_type!(
    /// Identifies an ability within a [`Dex`].
    AbilityId(u16)
);
id_type!(
    /// Identifies an item within a [`Dex`].
    ItemId(u16)
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
    /// Converts the ratio to the games' 4096-based fixed-point modifier.
    #[must_use]
    pub fn to_modifier(self) -> u32 {
        u32::from(self.numerator) * MODIFIER_SCALE / u32::from(self.denominator)
    }

    /// Multiplies `value` by the ratio and rounds to the nearest integer, halves up.
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
}

/// A non-volatile status condition.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StatusKind {
    /// Halves physical damage and deals 1/16 max HP each turn.
    Burn,
    /// Halves speed and prevents moving 25% of the time.
    Paralysis,
    /// Deals 1/8 max HP each turn.
    Poison,
    /// Deals escalating damage each turn, starting at 1/16 max HP.
    Toxic,
    /// Prevents moving for one to three turns.
    Sleep,
    /// Prevents moving until thawed, with a 20% chance each turn.
    Freeze,
}

impl StatusKind {
    /// The status a type immunity must list to block this one: `toxic` is blocked by `poison`.
    #[must_use]
    pub fn immunity_group(self) -> Self {
        match self {
            Self::Toxic => Self::Poison,
            other => other,
        }
    }
}

/// Whether a move deals physical damage, special damage, or none.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MoveCategory {
    /// Uses Attack against Defense.
    Physical,
    /// Uses Special Attack against Special Defense.
    Special,
    /// Deals no direct damage.
    Status,
}

/// Who a move is aimed at.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MoveTarget {
    /// The opposing active creature. Subject to immunity and accuracy checks.
    #[default]
    Opponent,
    /// The user itself. Never misses.
    User,
}

/// Who receives a move effect.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EffectTarget {
    /// Whoever the move hit.
    #[default]
    Target,
    /// The move's user.
    User,
}

/// How many times a move strikes, written as `[min, max]` in data files.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "(u8, u8)", into = "(u8, u8)")]
pub struct HitRange {
    /// The fewest hits.
    pub min: u8,
    /// The most hits.
    pub max: u8,
}

impl HitRange {
    /// A move that strikes exactly once.
    pub const SINGLE: Self = Self { min: 1, max: 1 };
}

impl From<(u8, u8)> for HitRange {
    fn from((min, max): (u8, u8)) -> Self {
        Self { min, max }
    }
}

impl From<HitRange> for (u8, u8) {
    fn from(range: HitRange) -> Self {
        (range.min, range.max)
    }
}

/// Damage a move's user takes after hitting.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", deny_unknown_fields)]
pub enum Recoil {
    /// A fraction of the damage dealt, rounded.
    DamageDealt(Fraction),
    /// A fraction of the user's max HP, rounded.
    MaxHp(Fraction),
}

/// A compiled type.
#[derive(Clone, Debug)]
pub struct TypeData {
    /// Display name.
    pub name: String,
    /// Statuses creatures of this type cannot receive.
    pub status_immunities: Vec<StatusKind>,
    /// Whether damaging moves of this type thaw a frozen target.
    pub thaws_frozen_targets: bool,
}

/// A compiled weather.
#[derive(Clone, Debug)]
pub struct WeatherData {
    /// Display name.
    pub name: String,
    /// Turns the weather lasts once summoned.
    pub duration: u8,
    /// 4096-based damage modifiers by move type.
    pub damage_modifiers: Vec<(TypeId, u32)>,
    /// Fraction of max HP dealt to each active creature at the end of every turn.
    pub residual_damage: Option<Fraction>,
    /// Types that ignore the residual damage.
    pub residual_damage_immune_types: Vec<TypeId>,
    /// 4096-based defensive stat modifiers by type.
    pub defense_boosts: Vec<WeatherDefenseBoost>,
    /// Statuses that cannot be inflicted during the weather.
    pub prevents_statuses: Vec<StatusKind>,
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

/// A compiled move effect.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MoveEffect {
    /// Percent chance the effect applies; `None` always applies.
    pub chance: Option<u8>,
    /// Who receives the effect.
    pub target: EffectTarget,
    /// What the effect does.
    pub kind: EffectKind,
}

/// What a compiled move effect does.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EffectKind {
    /// Changes a stat stage.
    Boost {
        /// The stat to change.
        stat: BoostStat,
        /// Stages to add; negative values lower the stat.
        stages: i8,
    },
    /// Inflicts a non-volatile status.
    Status(StatusKind),
    /// Confuses the recipient.
    Confuse,
    /// Makes the recipient flinch.
    Flinch,
    /// Summons a weather.
    Weather(WeatherId),
    /// Restores a fraction of the recipient's max HP.
    Heal(Fraction),
}

/// A compiled move.
#[derive(Clone, Debug)]
pub struct MoveData {
    /// Display name.
    pub name: String,
    /// The move's type; `None` for typeless moves.
    pub move_type: Option<TypeId>,
    /// Physical, special, or status.
    pub category: MoveCategory,
    /// Base power; zero for status moves.
    pub power: u16,
    /// Accuracy percentage; `None` never misses.
    pub accuracy: Option<u8>,
    /// Base PP before PP Ups.
    pub pp: u8,
    /// Priority bracket.
    pub priority: i8,
    /// Who the move is aimed at.
    pub target: MoveTarget,
    /// Extra critical-hit stages.
    pub crit_stage: u8,
    /// How many times the move strikes.
    pub hits: HitRange,
    /// Fraction of damage dealt restored to the user.
    pub drain: Option<Fraction>,
    /// Damage the user takes after hitting.
    pub recoil: Option<Recoil>,
    /// Whether a status move fails against types immune to its type.
    pub respects_type_immunity: bool,
    /// Whether the move makes contact, triggering contact traits such as `contact_damage`.
    pub contact: bool,
    /// Effects applied when the move hits.
    pub effects: Vec<MoveEffect>,
}

impl MoveData {
    /// Whether the move deals direct damage.
    #[must_use]
    pub fn is_damaging(&self) -> bool {
        self.category != MoveCategory::Status
    }
}

/// The combined type effectiveness of an attack, as a power of two.
///
/// `Some(1)` is super effective (×2), `Some(-2)` is ×0.25, and `None` means no effect.
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
    species: Vec<SpeciesData>,
    moves: Vec<MoveData>,
    abilities: Vec<TraitData>,
    items: Vec<TraitData>,
    type_ids: HashMap<String, TypeId>,
    weather_ids: HashMap<String, WeatherId>,
    species_ids: HashMap<String, SpeciesId>,
    move_ids: HashMap<String, MoveId>,
    ability_ids: HashMap<String, AbilityId>,
    item_ids: HashMap<String, ItemId>,
    struggle: MoveId,
}

/// Normalizes a display name into a lookup key: lowercase letters and digits only.
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
            types: Vec::with_capacity(source.types.len()),
            matchups: Vec::new(),
            weathers: Vec::with_capacity(source.weathers.len()),
            species: Vec::with_capacity(source.species.len()),
            moves: Vec::with_capacity(source.moves.len() + 1),
            abilities: Vec::with_capacity(source.abilities.len()),
            items: Vec::with_capacity(source.items.len()),
            type_ids: HashMap::new(),
            weather_ids: HashMap::new(),
            species_ids: HashMap::new(),
            move_ids: HashMap::new(),
            ability_ids: HashMap::new(),
            item_ids: HashMap::new(),
            struggle: MoveId(0),
        };
        dex.compile_types(&source.types)?;
        for weather in &source.weathers {
            dex.compile_weather(weather)?;
        }
        for species in &source.species {
            dex.compile_species(species)?;
        }
        for move_source in &source.moves {
            dex.compile_move(move_source)?;
        }
        for ability in &source.abilities {
            let id =
                AbilityId::from_index(dex.abilities.len()).ok_or(DexError::TooMany("abilities"))?;
            insert_unique(&mut dex.ability_ids, "ability", &ability.name, id)?;
            let compiled = dex.compile_trait(ability, false)?;
            dex.abilities.push(compiled);
        }
        for item in &source.items {
            let id = ItemId::from_index(dex.items.len()).ok_or(DexError::TooMany("items"))?;
            insert_unique(&mut dex.item_ids, "item", &item.name, id)?;
            let compiled = dex.compile_trait(item, true)?;
            dex.items.push(compiled);
        }
        dex.struggle = match dex.move_ids.get("struggle") {
            Some(&id) => id,
            None => dex.compile_move(&built_in_struggle())?,
        };
        Ok(dex)
    }

    fn compile_types(&mut self, sources: &[TypeSource]) -> Result<(), DexError> {
        for source in sources {
            let id = TypeId::from_index(self.types.len()).ok_or(DexError::TooMany("types"))?;
            insert_unique(&mut self.type_ids, "type", &source.name, id)?;
            self.types.push(TypeData {
                name: source.name.clone(),
                status_immunities: source.status_immunities.clone(),
                thaws_frozen_targets: source.thaws_frozen_targets,
            });
        }
        let count = self.types.len();
        self.matchups = vec![Matchup::Neutral; count * count];
        for (attacker, source) in sources.iter().enumerate() {
            let lists = [
                (&source.super_effective_against, Matchup::SuperEffective),
                (
                    &source.not_very_effective_against,
                    Matchup::NotVeryEffective,
                ),
                (&source.no_effect_against, Matchup::NoEffect),
            ];
            for (names, matchup) in lists {
                for name in names {
                    let defender = self.resolve_type(name, &source.name)?;
                    let cell = &mut self.matchups[attacker * count + defender.index()];
                    if *cell != Matchup::Neutral {
                        return Err(DexError::invalid(
                            &source.name,
                            format!("lists its matchup against {name} more than once"),
                        ));
                    }
                    *cell = matchup;
                }
            }
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
        let residual_damage_immune_types = source
            .residual_damage_immune_types
            .iter()
            .map(|type_name| self.resolve_type(type_name, &source.name))
            .collect::<Result<_, _>>()?;
        let defense_boosts = source
            .defense_boosts
            .iter()
            .map(|boost| {
                if !matches!(boost.stat, Stat::Defense | Stat::SpecialDefense) {
                    return Err(DexError::invalid(
                        &source.name,
                        "can only boost defense or special_defense",
                    ));
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
            residual_damage_immune_types,
            defense_boosts,
            prevents_statuses: source.prevents_statuses.clone(),
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
        let base = source.base_stats;
        if [
            base.hp,
            base.attack,
            base.defense,
            base.special_attack,
            base.special_defense,
            base.speed,
        ]
        .contains(&0)
        {
            return Err(DexError::invalid(
                &source.name,
                "every base stat must be at least 1",
            ));
        }
        self.species.push(SpeciesData {
            name: source.name.clone(),
            primary_type,
            secondary_type,
            base_stats: base,
        });
        Ok(())
    }

    fn compile_move(&mut self, source: &MoveSource) -> Result<MoveId, DexError> {
        let id = MoveId::from_index(self.moves.len()).ok_or(DexError::TooMany("moves"))?;
        insert_unique(&mut self.move_ids, "move", &source.name, id)?;
        let name = source.name.as_str();
        let move_type = source
            .type_name
            .as_deref()
            .map(|type_name| self.resolve_type(type_name, name))
            .transpose()?;
        let damaging = source.category != MoveCategory::Status;
        if damaging && source.power == 0 {
            return Err(DexError::invalid(name, "damaging moves need power"));
        }
        if !damaging
            && (source.power > 0
                || source.hits.is_some()
                || source.drain.is_some()
                || matches!(source.recoil, Some(Recoil::DamageDealt(_))))
        {
            return Err(DexError::invalid(
                name,
                "status moves cannot have power, hits, drain, or damage-based recoil",
            ));
        }
        if source.pp == 0 {
            return Err(DexError::invalid(name, "needs at least 1 PP"));
        }
        if source
            .accuracy
            .is_some_and(|accuracy| accuracy == 0 || accuracy > 100)
        {
            return Err(DexError::invalid(
                name,
                "accuracy must be between 1 and 100",
            ));
        }
        let hits = source.hits.unwrap_or(HitRange::SINGLE);
        if hits.min == 0 || hits.min > hits.max {
            return Err(DexError::invalid(
                name,
                "hits must be [min, max] with 1 <= min <= max",
            ));
        }
        for fraction in [source.drain, source.recoil.map(recoil_fraction)]
            .into_iter()
            .flatten()
        {
            validate_fraction(fraction, name)?;
        }
        let effects = source
            .effects
            .iter()
            .map(|effect| self.compile_effect(effect, name))
            .collect::<Result<_, _>>()?;
        self.moves.push(MoveData {
            name: source.name.clone(),
            move_type,
            category: source.category,
            power: source.power,
            accuracy: source.accuracy,
            pp: source.pp,
            priority: source.priority,
            target: source.target,
            crit_stage: source.crit_stage,
            hits,
            drain: source.drain,
            recoil: source.recoil,
            respects_type_immunity: source.respects_type_immunity,
            contact: source.contact,
            effects,
        });
        Ok(id)
    }

    fn compile_effect(
        &self,
        source: &MoveEffectSource,
        owner: &str,
    ) -> Result<MoveEffect, DexError> {
        traits::validate_chance(source.chance, owner)?;
        let kind = match &source.effect {
            EffectSource::Boost { stat, stages } => {
                if *stages == 0 {
                    return Err(DexError::invalid(
                        owner,
                        "boost effects need non-zero stages",
                    ));
                }
                EffectKind::Boost {
                    stat: *stat,
                    stages: *stages,
                }
            }
            EffectSource::Status(status) => EffectKind::Status(*status),
            EffectSource::Confuse => EffectKind::Confuse,
            EffectSource::Flinch => EffectKind::Flinch,
            EffectSource::Weather(weather_name) => {
                EffectKind::Weather(self.resolve_weather(weather_name, owner)?)
            }
            EffectSource::Heal(fraction) => EffectKind::Heal(validate_fraction(*fraction, owner)?),
        };
        Ok(MoveEffect {
            chance: source.chance,
            target: source.target,
            kind,
        })
    }

    fn resolve_type(&self, name: &str, referenced_by: &str) -> Result<TypeId, DexError> {
        self.type_ids
            .get(&to_id(name))
            .copied()
            .ok_or_else(|| DexError::UnknownReference {
                kind: "type",
                name: name.to_owned(),
                referenced_by: referenced_by.to_owned(),
            })
    }

    fn resolve_weather(&self, name: &str, referenced_by: &str) -> Result<WeatherId, DexError> {
        self.weather_ids
            .get(&to_id(name))
            .copied()
            .ok_or_else(|| DexError::UnknownReference {
                kind: "weather",
                name: name.to_owned(),
                referenced_by: referenced_by.to_owned(),
            })
    }

    /// Returns an ability by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn ability(&self, id: AbilityId) -> &TraitData {
        &self.abilities[id.index()]
    }

    /// Returns an item by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn item(&self, id: ItemId) -> &TraitData {
        &self.items[id.index()]
    }

    /// Looks up an ability by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn ability_id(&self, name: &str) -> Option<AbilityId> {
        self.ability_ids.get(&to_id(name)).copied()
    }

    /// Looks up an item by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn item_id(&self, name: &str) -> Option<ItemId> {
        self.item_ids.get(&to_id(name)).copied()
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

    /// Returns a type by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn type_data(&self, id: TypeId) -> &TypeData {
        &self.types[id.index()]
    }

    /// Returns a weather by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn weather(&self, id: WeatherId) -> &WeatherData {
        &self.weathers[id.index()]
    }

    /// Returns a species by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn species(&self, id: SpeciesId) -> &SpeciesData {
        &self.species[id.index()]
    }

    /// Returns a move by ID.
    ///
    /// # Panics
    ///
    /// Panics if the ID is not from this dex.
    #[must_use]
    pub fn move_data(&self, id: MoveId) -> &MoveData {
        &self.moves[id.index()]
    }

    /// Looks up a type by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn type_id(&self, name: &str) -> Option<TypeId> {
        self.type_ids.get(&to_id(name)).copied()
    }

    /// Looks up a weather by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn weather_id(&self, name: &str) -> Option<WeatherId> {
        self.weather_ids.get(&to_id(name)).copied()
    }

    /// Looks up a species by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn species_id(&self, name: &str) -> Option<SpeciesId> {
        self.species_ids.get(&to_id(name)).copied()
    }

    /// Looks up a move by name, ignoring case, spaces, and punctuation.
    #[must_use]
    pub fn move_id(&self, name: &str) -> Option<MoveId> {
        self.move_ids.get(&to_id(name)).copied()
    }

    /// The move used when a creature has no PP left in any move.
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
        power: 50,
        accuracy: None,
        pp: 1,
        priority: 0,
        target: MoveTarget::Opponent,
        crit_stage: 0,
        hits: None,
        drain: None,
        recoil: Some(Recoil::MaxHp(Fraction::from((1, 4)))),
        respects_type_immunity: false,
        contact: true,
        effects: Vec::new(),
    }
}

fn recoil_fraction(recoil: Recoil) -> Fraction {
    match recoil {
        Recoil::DamageDealt(fraction) | Recoil::MaxHp(fraction) => fraction,
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

fn insert_unique<Id: Copy>(
    ids: &mut HashMap<String, Id>,
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
    use super::{Dex, DexError};

    fn sample() -> Dex {
        Dex::from_json(crate::SAMPLE_DEX_JSON).expect("the sample dex compiles")
    }

    fn compile(json: &str) -> Result<Dex, DexError> {
        Dex::from_json(json)
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
    fn looks_up_names_ignoring_case_and_punctuation() {
        let dex = sample();
        assert_eq!(dex.move_id("swift-strike"), dex.move_id("Swift Strike"));
        assert!(dex.species_id("CINDERCUB").is_some());
        assert_eq!(dex.move_data(dex.struggle()).name, "Struggle");
    }

    #[test]
    fn rejects_references_to_unknown_content() {
        let error = compile(
            r#"{"types":[{"name":"Fire"}],"species":[{"name":"Blob","types":["Water"],
            "base_stats":{"hp":1,"attack":1,"defense":1,"special_attack":1,
            "special_defense":1,"speed":1}}],"moves":[]}"#,
        )
        .unwrap_err();
        assert!(matches!(
            error,
            DexError::UnknownReference { kind: "type", .. }
        ));
    }

    #[test]
    fn rejects_names_that_collide_after_normalization() {
        let error =
            compile(r#"{"types":[{"name":"Fire"},{"name":"fire"}],"species":[],"moves":[]}"#)
                .unwrap_err();
        assert!(matches!(
            error,
            DexError::DuplicateName { kind: "type", .. }
        ));
    }

    #[test]
    fn rejects_status_moves_with_power() {
        let error = compile(
            r#"{"types":[{"name":"Fire"}],"species":[],"moves":[{"name":"Glow",
            "type":"Fire","category":"status","power":40,"pp":10}]}"#,
        )
        .unwrap_err();
        assert!(matches!(error, DexError::InvalidValue { .. }));
    }

    #[test]
    fn rejects_misspelled_fields() {
        let error = compile(
            r#"{"types":[{"name":"Fire","super_efective_against":[]}],"species":[],"moves":[]}"#,
        )
        .unwrap_err();
        assert!(matches!(error, DexError::Json(_)));
    }
}
