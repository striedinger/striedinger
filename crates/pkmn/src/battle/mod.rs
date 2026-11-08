//! Singles battles: building teams, requesting choices, and resolving turns.

mod damage;
mod engine;
mod events;
mod request;
mod state;
mod team;

use std::fmt;
use std::sync::Arc;

pub use damage::{DAMAGE_ROLLS, DamageInput, STAB_MODIFIER, calculate_damage};
pub use events::{CantReason, DamageSource, Effect, Event, HealSource};
pub use request::{Choice, ChoiceError, ChoiceErrorReason, MoveOption, Request};
pub use state::{
    BattleState, Field, LockedMove, MAX_MOVES, MoveSlot, Outcome, Pokemon, QueuedAction, Side,
    SideConditionState, SideId, Stall, StatusState, TerrainState, Volatiles, WeatherState,
};
pub use team::{MAX_TEAM_SIZE, PokemonSet, TeamError, TeamErrorReason};

use crate::dex::Dex;
use crate::prng::Prng;
use engine::Engine;

/// A singles battle between two sides.
///
/// Each step asks both sides for a [`Choice`] matching their [`Request`], resolves it, and
/// records what happened as [`Event`]s. The battle is deterministic for a given seed, and its
/// whole state can be cloned or serialized to support replays, saves, and search.
#[derive(Clone, Debug)]
pub struct Battle {
    dex: Arc<Dex>,
    state: BattleState,
    events: Vec<Event>,
}

impl Battle {
    /// Starts a battle, sending out the first member of each team.
    ///
    /// # Errors
    ///
    /// Returns an error if either team is invalid for `dex`.
    pub fn new(dex: Arc<Dex>, teams: [&[PokemonSet]; 2], seed: u64) -> Result<Self, TeamError> {
        let sides = [
            team::build_side(&dex, SideId::P1, teams[0])?,
            team::build_side(&dex, SideId::P2, teams[1])?,
        ];
        let mut battle = Self {
            dex,
            state: BattleState {
                turn: 0,
                prng: Prng::new(seed),
                sides,
                field: Field::default(),
                outcome: None,
                queue: None,
            },
            events: Vec::with_capacity(64),
        };
        Engine::new(&battle.dex, &mut battle.state, &mut battle.events).start();
        Ok(battle)
    }

    /// Resumes a battle from a saved state.
    ///
    /// # Errors
    ///
    /// Returns an error if the state references content `dex` does not have.
    pub fn from_state(dex: Arc<Dex>, state: BattleState) -> Result<Self, InvalidStateError> {
        validate_state(&dex, &state)?;
        Ok(Self {
            dex,
            state,
            events: Vec::new(),
        })
    }

    /// The content this battle uses.
    #[must_use]
    pub fn dex(&self) -> &Dex {
        &self.dex
    }

    /// The full battle state.
    #[must_use]
    pub fn state(&self) -> &BattleState {
        &self.state
    }

    /// Consumes the battle and returns its state.
    #[must_use]
    pub fn into_state(self) -> BattleState {
        self.state
    }

    /// Events from the last call to [`Battle::new`] or [`Battle::submit`].
    #[must_use]
    pub fn events(&self) -> &[Event] {
        &self.events
    }

    /// The result, once the battle has ended.
    #[must_use]
    pub fn outcome(&self) -> Option<Outcome> {
        self.state.outcome
    }

    /// What `side` must decide next, or `None` once the battle has ended.
    #[must_use]
    pub fn request(&self, side: SideId) -> Option<Request> {
        request::request(&self.dex, &self.state, side)
    }

    /// Every legal choice for `side`, without allocating; empty once the battle has ended.
    pub fn choices(&self, side: SideId) -> impl Iterator<Item = Choice> + '_ {
        request::choices(&self.dex, &self.state, side)
    }

    /// Checks a choice against the current request without submitting it.
    ///
    /// # Errors
    ///
    /// Returns why the choice would be rejected.
    pub fn validate(&self, side: SideId, choice: Choice) -> Result<(), ChoiceError> {
        request::validate(&self.dex, &self.state, side, choice)
    }

    /// Submits both sides' choices, indexed by [`SideId::index`], and resolves them.
    ///
    /// Nothing changes if either choice is invalid.
    ///
    /// # Errors
    ///
    /// Returns the first invalid choice.
    pub fn submit(&mut self, choices: [Choice; 2]) -> Result<&[Event], ChoiceError> {
        for side in SideId::BOTH {
            self.validate(side, choices[side.index()])?;
        }
        self.events.clear();
        Engine::new(&self.dex, &mut self.state, &mut self.events).run(choices);
        Ok(&self.events)
    }
}

/// A saved state references content the dex does not have.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InvalidStateError {
    /// What is wrong.
    pub reason: &'static str,
}

impl fmt::Display for InvalidStateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "invalid battle state: {}", self.reason)
    }
}

impl std::error::Error for InvalidStateError {}

fn validate_state(dex: &Dex, state: &BattleState) -> Result<(), InvalidStateError> {
    let invalid = |reason| Err(InvalidStateError { reason });
    if state
        .field
        .weather
        .is_some_and(|weather| weather.id.index() >= dex.weather_count())
    {
        return invalid("unknown weather");
    }
    let queued_slot_is_valid = |side: &Side, action: &QueuedAction| match *action {
        QueuedAction::Switch(slot) => slot < side.team.len(),
        QueuedAction::Move(slot) => slot.is_none_or(|slot| slot < MAX_MOVES),
    };
    if state
        .field
        .terrain
        .is_some_and(|terrain| terrain.id.index() >= dex.terrain_count())
    {
        return invalid("unknown terrain");
    }
    if let Some(queue) = &state.queue
        && queue.iter().zip(&state.sides).any(|(action, side)| {
            action
                .as_ref()
                .is_some_and(|action| !queued_slot_is_valid(side, action))
        })
    {
        return invalid("a queued action names a slot that does not exist");
    }
    for side in &state.sides {
        if side.team.is_empty() || side.team.len() > MAX_TEAM_SIZE {
            return invalid("a team must have one to six members");
        }
        if side.active >= side.team.len() {
            return invalid("the active slot is outside the team");
        }
        let mut order = side.switch_order.clone();
        order.sort_unstable();
        if !order.iter().copied().eq(0..side.team.len())
            || side.switch_order.first() != Some(&side.active)
        {
            return invalid("switchOrder must list every team slot once, the active one first");
        }
        if side.conditions.iter().any(|condition| {
            condition.id.index() >= dex.side_condition_count()
                || condition.layers == 0
                || condition.layers > dex.side_condition(condition.id).max_layers()
        }) {
            return invalid("unknown side condition or impossible layer count");
        }
        for pokemon in &side.team {
            validate_pokemon(dex, pokemon).map_err(|reason| InvalidStateError { reason })?;
        }
    }
    Ok(())
}

/// The checks on one team member; returns the reason it is invalid.
fn validate_pokemon(dex: &Dex, pokemon: &Pokemon) -> Result<(), &'static str> {
    if pokemon.species.index() >= dex.species_count() {
        return Err("unknown species");
    }
    if pokemon
        .types()
        .any(|type_id| type_id.index() >= dex.type_count())
    {
        return Err("unknown type");
    }
    if pokemon
        .moves()
        .any(|(_, move_slot)| move_slot.id.index() >= dex.move_count())
    {
        return Err("unknown move");
    }
    if pokemon.moves().next().is_none() {
        return Err("a team member has no moves");
    }
    if pokemon
        .ability
        .is_some_and(|id| id.index() >= dex.ability_count())
        || pokemon
            .item
            .is_some_and(|id| id.index() >= dex.item_count())
    {
        return Err("unknown ability or item");
    }
    if pokemon.tera_type.index() >= dex.type_count() {
        return Err("unknown Tera type");
    }
    let names_empty_slot = |slot: Option<u8>| {
        slot.is_some_and(|slot| {
            pokemon
                .move_slots
                .get(usize::from(slot))
                .copied()
                .flatten()
                .is_none()
        })
    };
    if names_empty_slot(pokemon.volatiles.locked_move.map(|locked| locked.slot))
        || names_empty_slot(pokemon.volatiles.charging)
    {
        return Err("a rampage or charge names an empty move slot");
    }
    if pokemon.hp > pokemon.max_hp() {
        return Err("HP above max HP");
    }
    Ok(())
}
