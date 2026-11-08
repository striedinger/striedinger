use std::fmt;

use serde::{Deserialize, Deserializer, Serialize};

use super::state::{MAX_MOVES, MoveSlot, Pokemon, Side, SideId, Volatiles};
use crate::dex::Dex;
use crate::stats::{
    Boosts, MAX_EV, MAX_IV, MAX_TOTAL_EVS, Nature, Stat, StatTable, calculate_stats,
};

/// The most creatures a team can have.
pub const MAX_TEAM_SIZE: usize = 6;

/// A team member as a player builds it, referencing content by name.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PokemonSet {
    /// The species name.
    pub species: String,
    /// The level; defaults to 100.
    #[serde(default = "default_level")]
    pub level: u8,
    /// One to four distinct move names.
    pub moves: Vec<String>,
    /// Effort values; omitted stats are zero.
    #[serde(default)]
    pub evs: StatTable,
    /// Individual values; omitted stats are 31.
    #[serde(default = "max_ivs", deserialize_with = "deserialize_ivs")]
    pub ivs: StatTable,
    /// The nature; omitted means neutral.
    #[serde(default)]
    pub nature: Option<Nature>,
}

impl PokemonSet {
    /// A level 100 set with no EVs, perfect IVs, and a neutral nature.
    #[must_use]
    pub fn new(species: &str, moves: &[&str]) -> Self {
        Self {
            species: species.to_owned(),
            level: default_level(),
            moves: moves.iter().map(|&name| name.to_owned()).collect(),
            evs: StatTable::default(),
            ivs: max_ivs(),
            nature: None,
        }
    }
}

fn default_level() -> u8 {
    100
}

fn max_ivs() -> StatTable {
    StatTable {
        hp: MAX_IV,
        attack: MAX_IV,
        defense: MAX_IV,
        special_attack: MAX_IV,
        special_defense: MAX_IV,
        speed: MAX_IV,
    }
}

fn deserialize_ivs<'de, D: Deserializer<'de>>(deserializer: D) -> Result<StatTable, D::Error> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct PartialIvs {
        hp: Option<u16>,
        attack: Option<u16>,
        defense: Option<u16>,
        special_attack: Option<u16>,
        special_defense: Option<u16>,
        speed: Option<u16>,
    }
    let partial = PartialIvs::deserialize(deserializer)?;
    Ok(StatTable {
        hp: partial.hp.unwrap_or(MAX_IV),
        attack: partial.attack.unwrap_or(MAX_IV),
        defense: partial.defense.unwrap_or(MAX_IV),
        special_attack: partial.special_attack.unwrap_or(MAX_IV),
        special_defense: partial.special_defense.unwrap_or(MAX_IV),
        speed: partial.speed.unwrap_or(MAX_IV),
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
    /// The nature changes HP.
    Nature,
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
            TeamErrorReason::Nature => write!(formatter, " has a nature that changes HP"),
        }
    }
}

impl std::error::Error for TeamError {}

pub(crate) fn build_side(dex: &Dex, side: SideId, sets: &[PokemonSet]) -> Result<Side, TeamError> {
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
        .map(|(slot, set)| build_pokemon(dex, set).map_err(|reason| team_error(Some(slot), reason)))
        .collect::<Result<_, _>>()?;
    Ok(Side { team, active: 0 })
}

fn build_pokemon(dex: &Dex, set: &PokemonSet) -> Result<Pokemon, TeamErrorReason> {
    let species_id = dex
        .species_id(&set.species)
        .ok_or_else(|| TeamErrorReason::UnknownSpecies(set.species.clone()))?;
    if !(1..=100).contains(&set.level) {
        return Err(TeamErrorReason::Level(set.level));
    }
    if set.moves.is_empty() || set.moves.len() > MAX_MOVES {
        return Err(TeamErrorReason::MoveCount(set.moves.len()));
    }
    if set.ivs.max() > MAX_IV {
        return Err(TeamErrorReason::Iv);
    }
    if set.evs.max() > MAX_EV || set.evs.total() > MAX_TOTAL_EVS {
        return Err(TeamErrorReason::Ev);
    }
    if set
        .nature
        .is_some_and(|nature| nature.increased == Stat::Hp || nature.decreased == Stat::Hp)
    {
        return Err(TeamErrorReason::Nature);
    }
    let mut moves = [None; MAX_MOVES];
    for (slot, name) in set.moves.iter().enumerate() {
        let id = dex
            .move_id(name)
            .ok_or_else(|| TeamErrorReason::UnknownMove(name.clone()))?;
        if moves
            .iter()
            .flatten()
            .any(|known: &MoveSlot| known.id == id)
        {
            return Err(TeamErrorReason::DuplicateMove(name.clone()));
        }
        let pp = dex.move_data(id).pp;
        let max_pp = u8::try_from(u16::from(pp) * 8 / 5).unwrap_or(u8::MAX);
        moves[slot] = Some(MoveSlot {
            id,
            pp: max_pp,
            max_pp,
        });
    }
    let species = dex.species(species_id);
    let stats = calculate_stats(
        &species.base_stats,
        &set.ivs,
        &set.evs,
        set.level,
        set.nature,
    );
    Ok(Pokemon {
        species: species_id,
        level: set.level,
        primary_type: species.primary_type,
        secondary_type: species.secondary_type,
        stats,
        hp: stats.hp,
        moves,
        status: None,
        boosts: Boosts::default(),
        volatiles: Volatiles::default(),
    })
}
