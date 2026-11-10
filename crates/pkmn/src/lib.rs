//! A deterministic, data-driven battle engine that follows the main series' Generation 9
//! singles mechanics.
//!
//! Content (types, weather, species, moves, abilities, and items) lives in an editable
//! [`DexSource`] that is compiled into a [`Dex`] with numeric IDs. A [`Battle`] takes one
//! [`Choice`] per side, resolves the turn, and reports what happened as [`Event`]s, leaving all
//! presentation to the frontend.
//!
//! ```
//! use std::sync::Arc;
//!
//! use pkmn::{Battle, Choice, Dex, PokemonSet};
//!
//! let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON)?);
//! let team = [PokemonSet::new("Cindercub", &["Ember Snap", "Swift Strike"])];
//! let rival = [PokemonSet::new("Bramblehog", &["Thorn Volley"])];
//! let mut battle = Battle::new(dex, [&team, &rival], 1)?;
//! let events = battle.submit([Choice::Move(0), Choice::Move(0)])?;
//! assert!(!events.is_empty());
//! # Ok::<(), Box<dyn std::error::Error>>(())
//! ```

pub mod battle;
pub mod dex;
pub mod prng;
pub mod stats;

pub use battle::{
    Battle, BattleState, Choice, Event, GameType, Outcome, PokemonSet, Position, Request, SideId,
};
pub use dex::{Dex, DexSource};

/// A small original content pack with the full type chart, four weathers, and sample species,
/// moves, abilities, and items, for tests, examples, and as a template for new packs.
pub const SAMPLE_DEX_JSON: &str = include_str!("../data/sample.json");
