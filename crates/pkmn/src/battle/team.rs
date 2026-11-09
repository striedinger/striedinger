//! Team building from sets written like Pokémon Showdown's `PokemonSet`.

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize};

use super::state::{
    GameType, MAX_ACTIVE, MAX_MOVES, MoveSlot, Pokemon, Side, SideId, StatusState, TeraType,
    Volatiles,
};
use crate::dex::{Dex, HandlerMask, LearnMethod};
use crate::stats::{Boosts, MAX_EV, MAX_IV, MAX_TOTAL_EVS, StatTable, calculate_stats};

/// The most creatures a team can have.
pub const MAX_TEAM_SIZE: usize = 6;

/// A team member as a player builds it, in the shape of Showdown's `PokemonSet`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PokemonSet {
    /// A nickname; defaults to the species name.
    #[serde(default)]
    pub name: Option<String>,
    /// The species name.
    pub species: String,
    /// The held item name.
    #[serde(default)]
    pub item: Option<String>,
    /// The ability name.
    #[serde(default)]
    pub ability: Option<String>,
    /// One to four distinct move names.
    pub moves: Vec<String>,
    /// The nature name; omitted is neutral.
    #[serde(default)]
    pub nature: Option<String>,
    /// Effort values; omitted stats are zero.
    #[serde(default)]
    pub evs: StatTable,
    /// Individual values; omitted stats are 31.
    #[serde(default = "max_ivs", deserialize_with = "deserialize_ivs")]
    pub ivs: StatTable,
    /// The level; defaults to 100.
    #[serde(default = "default_level")]
    pub level: u8,
    /// The type it Terastallizes into; defaults to its primary type.
    #[serde(default)]
    pub tera_type: Option<String>,
}

impl PokemonSet {
    /// A level 100 set with no EVs, perfect IVs, a neutral nature, and no ability or item.
    #[must_use]
    pub fn new(species: &str, moves: &[&str]) -> Self {
        Self {
            name: None,
            species: species.to_owned(),
            item: None,
            ability: None,
            moves: moves.iter().map(|&name| name.to_owned()).collect(),
            nature: None,
            evs: StatTable::default(),
            ivs: max_ivs(),
            level: default_level(),
            tera_type: None,
        }
    }

    /// Returns the set with an ability.
    #[must_use]
    pub fn with_ability(mut self, ability: &str) -> Self {
        self.ability = Some(ability.to_owned());
        self
    }

    /// Returns the set holding an item.
    #[must_use]
    pub fn with_item(mut self, item: &str) -> Self {
        self.item = Some(item.to_owned());
        self
    }

    /// Checks that the set is legal, as Showdown's `TeamValidator` does: everything
    /// [`Battle::new`](crate::Battle::new) checks, and that the species can learn each move.
    /// A level-up move needs the set's level to be at least the level it is learned at, unless
    /// the species also learns it another way. Learnsets are each species' own; evolution
    /// lines are not followed.
    ///
    /// # Errors
    ///
    /// Returns the first problem found.
    pub fn validate(&self, dex: &Dex) -> Result<(), TeamErrorReason> {
        let pokemon = self.build(dex)?;
        let species = dex.species(pokemon.species);
        if let (Some(allowed), Some(ability)) = (&species.abilities, pokemon.ability)
            && !allowed.contains(&ability)
        {
            return Err(TeamErrorReason::IllegalAbility(
                self.ability.clone().unwrap_or_default(),
            ));
        }
        if let Some(level) = species.evo_level
            && self.level < level
        {
            return Err(TeamErrorReason::BelowEvolutionLevel(level));
        }
        for (name, (_, move_slot)) in self.moves.iter().zip(pokemon.moves()) {
            // The species learns a move if it or a pre-evolution does.
            let line = std::iter::successors(Some(species), |stage| {
                stage.prevo.map(|prevo| dex.species(prevo))
            });
            let mut known = line
                .filter_map(|stage| stage.learn_sources(move_slot.id))
                .peekable();
            if known.peek().is_none() {
                return Err(TeamErrorReason::CannotLearn(name.clone()));
            }
            let earliest_level = known
                .flatten()
                .map(|source| match source.method {
                    LearnMethod::LevelUp(level) => level,
                    LearnMethod::Machine
                    | LearnMethod::Tutor
                    | LearnMethod::Egg
                    | LearnMethod::Event => 1,
                })
                .min();
            if let Some(level) = earliest_level
                && level > self.level
            {
                return Err(TeamErrorReason::LearnedAtLevel {
                    name: name.clone(),
                    level,
                });
            }
        }
        Ok(())
    }

    /// Builds the creature this set describes, as it enters battle.
    ///
    /// # Errors
    ///
    /// Returns why the set is invalid for `dex`.
    pub fn build(&self, dex: &Dex) -> Result<Pokemon, TeamErrorReason> {
        let species_id = dex
            .species_id(&self.species)
            .ok_or_else(|| TeamErrorReason::UnknownSpecies(self.species.clone()))?;
        if !(1..=100).contains(&self.level) {
            return Err(TeamErrorReason::Level(self.level));
        }
        if self.moves.is_empty() || self.moves.len() > MAX_MOVES {
            return Err(TeamErrorReason::MoveCount(self.moves.len()));
        }
        if self.ivs.max() > MAX_IV {
            return Err(TeamErrorReason::Iv);
        }
        if self.evs.max() > MAX_EV || self.evs.total() > MAX_TOTAL_EVS {
            return Err(TeamErrorReason::Ev);
        }
        let mut move_slots = [None; MAX_MOVES];
        for (slot, name) in self.moves.iter().enumerate() {
            let id = dex
                .move_id(name)
                .ok_or_else(|| TeamErrorReason::UnknownMove(name.clone()))?;
            if move_slots
                .iter()
                .flatten()
                .any(|known: &MoveSlot| known.id == id)
            {
                return Err(TeamErrorReason::DuplicateMove(name.clone()));
            }
            let max_pp = u8::try_from(u16::from(dex.move_data(id).pp) * 8 / 5).unwrap_or(u8::MAX);
            move_slots[slot] = Some(MoveSlot {
                id,
                pp: max_pp,
                max_pp,
            });
        }
        let ability = resolve_name(
            self.ability.as_deref(),
            |name| dex.ability_id(name),
            TeamErrorReason::UnknownAbility,
        )?;
        let item = resolve_name(
            self.item.as_deref(),
            |name| dex.item_id(name),
            TeamErrorReason::UnknownItem,
        )?;
        let nature = resolve_name(
            self.nature.as_deref(),
            |name| dex.nature_id(name),
            TeamErrorReason::UnknownNature,
        )?
        .and_then(|id| dex.nature(id).nature);
        let species = dex.species(species_id);
        let tera_type = match self.tera_type.as_deref() {
            Some(name) if name.eq_ignore_ascii_case("stellar") => TeraType::Stellar,
            Some(name) => TeraType::Type(
                dex.type_id(name)
                    .ok_or_else(|| TeamErrorReason::UnknownType(name.to_owned()))?,
            ),
            None => TeraType::Type(species.primary_type),
        };
        let stats = calculate_stats(
            &species.base_stats,
            &self.ivs,
            &self.evs,
            self.level,
            nature,
        );
        Ok(Pokemon {
            species: species_id,
            level: self.level,
            primary_type: species.primary_type,
            secondary_type: species.secondary_type,
            stats,
            hp: stats.hp,
            move_slots,
            ability,
            item,
            status: None,
            status_state: StatusState::default(),
            boosts: Boosts::default(),
            volatiles: Volatiles::default(),
            active_turns: 0,
            speed: u32::from(stats.speed),
            tera_type,
            terastallized: false,
            stellar_boosted_types: 0,
            mask: HandlerMask::default(),
        }
        .with_mask(dex))
    }
}

/// Looks up an optional name, failing with `unknown` if it is given but does not exist.
fn resolve_name<Id>(
    name: Option<&str>,
    find: impl Fn(&str) -> Option<Id>,
    unknown: fn(String) -> TeamErrorReason,
) -> Result<Option<Id>, TeamErrorReason> {
    name.map(|name| find(name).ok_or_else(|| unknown(name.to_owned())))
        .transpose()
}

fn default_level() -> u8 {
    100
}

fn max_ivs() -> StatTable {
    StatTable::uniform(MAX_IV)
}

fn deserialize_ivs<'de, D: Deserializer<'de>>(deserializer: D) -> Result<StatTable, D::Error> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct PartialIvs {
        hp: Option<u16>,
        atk: Option<u16>,
        def: Option<u16>,
        spa: Option<u16>,
        spd: Option<u16>,
        spe: Option<u16>,
    }
    let partial = PartialIvs::deserialize(deserializer)?;
    Ok(StatTable {
        hp: partial.hp.unwrap_or(MAX_IV),
        attack: partial.atk.unwrap_or(MAX_IV),
        defense: partial.def.unwrap_or(MAX_IV),
        special_attack: partial.spa.unwrap_or(MAX_IV),
        special_defense: partial.spd.unwrap_or(MAX_IV),
        speed: partial.spe.unwrap_or(MAX_IV),
    })
}

/// Why a team could not enter battle.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TeamError {
    /// The side whose team is invalid.
    pub side: SideId,
    /// The offending team slot, if the problem is with one member.
    pub slot: Option<usize>,
    /// What is wrong.
    pub reason: TeamErrorReason,
}

/// What is wrong with a team.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TeamErrorReason {
    /// The team has no members.
    Empty,
    /// The team has more than six members.
    TooLarge(usize),
    /// The species does not exist.
    UnknownSpecies(String),
    /// A move does not exist.
    UnknownMove(String),
    /// The ability does not exist.
    UnknownAbility(String),
    /// The item does not exist.
    UnknownItem(String),
    /// The nature does not exist.
    UnknownNature(String),
    /// The Tera type does not exist.
    UnknownType(String),
    /// The set has no moves or more than four.
    MoveCount(usize),
    /// The set lists a move twice.
    DuplicateMove(String),
    /// The level is outside 1 to 100.
    Level(u8),
    /// An IV is above 31.
    Iv,
    /// An EV is above 252 or the total is above 510.
    Ev,
    /// The species cannot learn this move, nor can any of its pre-evolutions.
    CannotLearn(String),
    /// The species cannot have this ability.
    IllegalAbility(String),
    /// The set is below the level its species evolves at.
    BelowEvolutionLevel(u8),
    /// The species learns this move only by level-up, at a level above the set's.
    LearnedAtLevel {
        /// The move.
        name: String,
        /// The level it is learned at.
        level: u8,
    },
}

impl fmt::Display for TeamError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{:?} team", self.side)?;
        if let Some(slot) = self.slot {
            write!(formatter, " slot {slot}")?;
        }
        match &self.reason {
            TeamErrorReason::Empty => write!(formatter, " is empty"),
            TeamErrorReason::TooLarge(count) => {
                write!(
                    formatter,
                    " has {count} members; the limit is {MAX_TEAM_SIZE}"
                )
            }
            TeamErrorReason::UnknownSpecies(name) => {
                write!(formatter, ": unknown species {name:?}")
            }
            TeamErrorReason::UnknownMove(name) => write!(formatter, ": unknown move {name:?}"),
            TeamErrorReason::UnknownAbility(name) => {
                write!(formatter, ": unknown ability {name:?}")
            }
            TeamErrorReason::UnknownItem(name) => write!(formatter, ": unknown item {name:?}"),
            TeamErrorReason::UnknownNature(name) => write!(formatter, ": unknown nature {name:?}"),
            TeamErrorReason::UnknownType(name) => write!(formatter, ": unknown Tera type {name:?}"),
            TeamErrorReason::MoveCount(count) => {
                write!(formatter, " has {count} moves; it needs 1 to {MAX_MOVES}")
            }
            TeamErrorReason::DuplicateMove(name) => {
                write!(formatter, " lists {name:?} more than once")
            }
            TeamErrorReason::Level(level) => {
                write!(formatter, " has level {level}; it must be 1 to 100")
            }
            TeamErrorReason::Iv => write!(formatter, " has an IV above {MAX_IV}"),
            TeamErrorReason::Ev => write!(
                formatter,
                " has an EV above {MAX_EV} or more than {MAX_TOTAL_EVS} in total"
            ),
            TeamErrorReason::CannotLearn(name) => write!(formatter, " can't learn {name:?}"),
            TeamErrorReason::IllegalAbility(name) => {
                write!(formatter, " can't have the ability {name:?}")
            }
            TeamErrorReason::BelowEvolutionLevel(level) => {
                write!(formatter, " evolves at level {level}, above the set's")
            }
            TeamErrorReason::LearnedAtLevel { name, level } => {
                write!(formatter, " learns {name:?} only at level {level}")
            }
        }
    }
}

impl std::error::Error for TeamError {}

pub(crate) fn build_side(
    dex: &Dex,
    side: SideId,
    sets: &[PokemonSet],
    game_type: GameType,
) -> Result<Side, TeamError> {
    let team_error = |slot, reason| TeamError { side, slot, reason };
    if sets.is_empty() {
        return Err(team_error(None, TeamErrorReason::Empty));
    }
    if sets.len() > MAX_TEAM_SIZE {
        return Err(team_error(None, TeamErrorReason::TooLarge(sets.len())));
    }
    let team = sets
        .iter()
        .enumerate()
        .map(|(slot, set)| {
            set.build(dex)
                .map_err(|reason| team_error(Some(slot), reason))
        })
        .collect::<Result<_, _>>()?;
    let switch_order = (0..sets.len()).collect();
    // The first team members lead, one per position.
    let active = [0, 1, 2]
        .map(|index| (index < sets.len().min(game_type.active_per_side())).then_some(index));
    Ok(Side {
        team,
        active,
        conditions: Vec::new(),
        switch_flag: [false; MAX_ACTIVE],
        baton_pass: [false; MAX_ACTIVE],
        can_terastallize: true,
        switch_order,
    })
}
