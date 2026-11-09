//! Battles: building teams, requesting choices, and resolving turns.

mod damage;
mod engine;
mod events;
mod request;
mod state;
mod team;

use std::fmt;
use std::sync::Arc;

pub use damage::{
    DAMAGE_ROLLS, DamageInput, FREE_FOR_ALL_SPREAD_MODIFIER, SPREAD_MODIFIER, STAB_MODIFIER,
    calculate_damage,
};
pub use events::{CantReason, DamageSource, Effect, Event, HealSource};
pub use request::{Choice, ChoiceError, ChoiceErrorReason, Choices, MoveOption, Request};
pub use state::{
    BattleState, Field, GameType, LockedMove, MAX_ACTIVE, MAX_MOVES, MAX_POSITIONS, MAX_SIDES,
    MoveRestriction, MoveSlot, Outcome, Pokemon, Position, PseudoWeatherState, QueuedAction, Side,
    SideConditionState, SideId, Stall, StatusState, TeraType, TerrainState, Volatiles,
    WeatherState,
};
pub use team::{MAX_TEAM_SIZE, PokemonSet, TeamError, TeamErrorReason};

use crate::dex::Dex;
use crate::prng::Prng;
use engine::Engine;

/// A singles, doubles or triples battle between two sides, or a free-for-all among four.
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
    /// Starts a singles battle, sending out the first member of each team.
    ///
    /// # Errors
    ///
    /// Returns an error if either team is invalid for `dex`.
    pub fn new(dex: Arc<Dex>, teams: [&[PokemonSet]; 2], seed: u64) -> Result<Self, TeamError> {
        Self::start(dex, &teams, seed, GameType::Singles)
    }

    /// Starts a doubles battle, sending out the first two members of each team.
    ///
    /// # Errors
    ///
    /// Returns an error if either team is invalid for `dex`.
    pub fn doubles(dex: Arc<Dex>, teams: [&[PokemonSet]; 2], seed: u64) -> Result<Self, TeamError> {
        Self::start(dex, &teams, seed, GameType::Doubles)
    }

    /// Starts a triples battle, sending out the first three members of each team.
    ///
    /// # Errors
    ///
    /// Returns an error if either team is invalid for `dex`.
    pub fn triples(dex: Arc<Dex>, teams: [&[PokemonSet]; 2], seed: u64) -> Result<Self, TeamError> {
        Self::start(dex, &teams, seed, GameType::Triples)
    }

    /// Starts a free-for-all among four sides, sending out the first member of each team.
    ///
    /// # Errors
    ///
    /// Returns an error if any team is invalid for `dex`.
    pub fn free_for_all(
        dex: Arc<Dex>,
        teams: [&[PokemonSet]; MAX_SIDES],
        seed: u64,
    ) -> Result<Self, TeamError> {
        Self::start(dex, &teams, seed, GameType::FreeForAll)
    }

    fn start(
        dex: Arc<Dex>,
        teams: &[&[PokemonSet]],
        seed: u64,
        game_type: GameType,
    ) -> Result<Self, TeamError> {
        let sides = SideId::ALL
            .into_iter()
            .zip(teams)
            .map(|(side, team)| team::build_side(&dex, side, team, game_type))
            .collect::<Result<_, _>>()?;
        let mut battle = Self {
            dex,
            state: BattleState {
                turn: 0,
                prng: Prng::new(seed),
                sides,
                field: Field::default(),
                outcome: None,
                last_move: None,
                queue: None,
                game_type,
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
    pub fn from_state(dex: Arc<Dex>, mut state: BattleState) -> Result<Self, InvalidStateError> {
        validate_state(&dex, &state)?;
        for pokemon in state.sides.iter_mut().flat_map(|side| side.team.iter_mut()) {
            pokemon.refresh_mask(&dex);
        }
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

    /// What a position must decide next, or `None` once the battle has ended. A side stands
    /// for its first position, the only one in singles.
    #[must_use]
    pub fn request(&self, position: impl Into<Position>) -> Option<Request> {
        request::request(&self.dex, &self.state, position.into())
    }

    /// Every legal choice for a position, without allocating; empty once the battle has ended.
    pub fn choices(&self, position: impl Into<Position>) -> Choices {
        request::choices(&self.dex, &self.state, position.into())
    }

    /// Checks a choice against the current request without submitting it.
    ///
    /// # Errors
    ///
    /// Returns why the choice would be rejected.
    pub fn validate(
        &self,
        position: impl Into<Position>,
        choice: Choice,
    ) -> Result<(), ChoiceError> {
        request::validate(&self.dex, &self.state, position.into(), choice)
    }

    /// Submits both sides' choices in singles, indexed by [`SideId::index`], and resolves them.
    ///
    /// Nothing changes if either choice is invalid.
    ///
    /// # Errors
    ///
    /// Returns the first invalid choice.
    pub fn submit(&mut self, choices: [Choice; 2]) -> Result<&[Event], ChoiceError> {
        if self.state.game_type != GameType::Singles {
            return self.submit_all(&choices.map(|choice| [choice, Choice::Pass, Choice::Pass]));
        }
        for side in SideId::BOTH {
            self.validate(side, choices[side.index()])?;
        }
        self.events.clear();
        let mut by_position = [Choice::Pass; MAX_POSITIONS];
        for side in SideId::BOTH {
            by_position[Position::from(side).flat()] = choices[side.index()];
        }
        Engine::new(&self.dex, &mut self.state, &mut self.events).run(by_position);
        Ok(&self.events)
    }

    /// Submits both sides' choices for their two positions, as [`Battle::submit_all`] does.
    ///
    /// # Errors
    ///
    /// Returns the first invalid choice.
    pub fn submit_doubles(&mut self, choices: [[Choice; 2]; 2]) -> Result<&[Event], ChoiceError> {
        self.submit_all(&choices.map(|[first, second]| [first, second, Choice::Pass]))
    }

    /// Submits the four sides' choices in a free-for-all, as [`Battle::submit_all`] does.
    ///
    /// # Errors
    ///
    /// Returns the first invalid choice.
    pub fn submit_free_for_all(
        &mut self,
        choices: [Choice; MAX_SIDES],
    ) -> Result<&[Event], ChoiceError> {
        self.submit_all(&choices.map(|choice| [choice, Choice::Pass, Choice::Pass]))
    }

    /// Submits every position's choice, one row per side and one entry per position, and
    /// resolves them, in any game type. A missing row passes; choices for positions past the
    /// battle's must be [`Choice::Pass`].
    ///
    /// Nothing changes if any choice is invalid.
    ///
    /// # Errors
    ///
    /// Returns the first invalid choice.
    pub fn submit_all(
        &mut self,
        choices: &[[Choice; MAX_ACTIVE]],
    ) -> Result<&[Event], ChoiceError> {
        let in_battle = self.state.positions();
        let mut by_position = Vec::with_capacity(MAX_POSITIONS);
        for (side, row) in SideId::ALL.into_iter().zip(choices) {
            for (index, &choice) in (0_u8..).zip(row) {
                let position = Position::new(side, index);
                if in_battle.iter().any(|open| open == position) {
                    by_position.push((position, choice));
                } else if choice != Choice::Pass {
                    return Err(ChoiceError {
                        position,
                        choice,
                        reason: ChoiceErrorReason::WrongKind,
                    });
                }
            }
        }
        for position in in_battle.iter() {
            let choice = by_position
                .iter()
                .find(|(open, _)| *open == position)
                .map_or(Choice::Pass, |&(_, choice)| choice);
            self.validate(position, choice)?;
        }
        // Positions on one side can only conflict with more than one a side.
        if self.state.game_type.active_per_side() > 1 {
            for side in self.state.side_ids() {
                request::validate_side(&self.state, side, &by_position)?;
            }
        }
        let mut flat = [Choice::Pass; MAX_POSITIONS];
        for &(position, choice) in &by_position {
            flat[position.flat()] = choice;
        }
        self.events.clear();
        Engine::new(&self.dex, &mut self.state, &mut self.events).run(flat);
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
        QueuedAction::Shift => true,
        QueuedAction::Move {
            slot,
            target,
            move_id,
        } => {
            slot.is_none_or(|slot| slot < MAX_MOVES)
                && target.is_none_or(|target| target != 0)
                && move_id.index() < dex.move_count()
        }
    };
    if state
        .field
        .terrain
        .is_some_and(|terrain| terrain.id.index() >= dex.terrain_count())
    {
        return invalid("unknown terrain");
    }
    if state.field.pseudo_weathers.iter().any(|condition| {
        condition.id.index() >= dex.pseudo_weather_count() || condition.duration == 0
    }) {
        return invalid("unknown pseudo-weather");
    }
    if state.sides.len() != state.game_type.side_count() {
        return invalid("the number of sides does not match the game type");
    }
    if let Some(queue) = &state.queue
        && queue.iter().enumerate().any(|(flat, action)| {
            action.as_ref().is_some_and(|action| {
                state
                    .positions()
                    .iter()
                    .find(|position| position.flat() == flat)
                    .is_none_or(|position| !queued_slot_is_valid(state.side(position.side), action))
            })
        })
    {
        return invalid("a queued action names a slot that does not exist");
    }
    for side in &state.sides {
        if side.team.is_empty() || side.team.len() > MAX_TEAM_SIZE {
            return invalid("a team must have one to six members");
        }
        let positions = state.game_type.active_per_side();
        let active: Vec<usize> = side.active.iter().flatten().copied().collect();
        let mut distinct = active.clone();
        distinct.sort_unstable();
        distinct.dedup();
        if active.is_empty()
            || side.active[0].is_none()
            || active.len() > positions
            || distinct.len() != active.len()
            || active.iter().any(|&slot| slot >= side.team.len())
        {
            return invalid("each position needs a distinct team slot");
        }
        let mut order = side.switch_order.clone();
        order.sort_unstable();
        if !order.iter().copied().eq(0..side.team.len()) || !side.switch_order.starts_with(&active)
        {
            return invalid("switchOrder must list every team slot once, the active ones first");
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
    if let TeraType::Type(tera_type) = pokemon.tera_type
        && tera_type.index() >= dex.type_count()
    {
        return Err("unknown Tera type");
    }
    if pokemon
        .forced_move()
        .is_some_and(|move_id| move_id.index() >= dex.move_count())
    {
        return Err("a rampage or charge names an unknown move");
    }
    if pokemon.hp > pokemon.max_hp() {
        return Err("HP above max HP");
    }
    Ok(())
}
