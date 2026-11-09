//! Turn resolution. The engine borrows the content and the state separately, so content can
//! be read while the state is mutated.
//!
//! Ordering and random-number consumption follow Pokémon Showdown's Generation 9 simulator, so
//! both can be driven from the same seed and compared roll for roll. Handler lookups are gated
//! by each creature's [`HandlerMask`], so creatures without a relevant ability or item cost
//! nothing extra.

mod modifiers;
mod moves;
mod queue;
mod residual;

use std::cmp::Ordering;

use super::MAX_TEAM_SIZE;
use super::events::{DamageSource, Effect, Event, HealSource};
use super::request::Choice;
use super::state::{
    BattleState, GameType, MAX_POSITIONS, MAX_SIDES, Outcome, Pokemon, Position, Positions,
    PseudoWeatherState, QueuedAction, SideConditionState, SideId, Volatiles, WeatherState,
};
use crate::dex::{Dex, Handler, HandlerMask, Status, WeatherData, WeatherId};
use crate::dex::{MoveId, PseudoWeatherId, SwitchInDamage, SwitchInStatus, TypeId};
use crate::stats::{BoostStat, Boosts, saturate_u16};
use modifiers::ACTION_SPEED_BITS;
use queue::Queue;

/// Creatures whose HP reached zero, in order, until the next faint check. At most every
/// position can be queued between checks.
#[derive(Clone, Copy, Debug, Default)]
struct FaintQueue {
    positions: [Option<Position>; MAX_POSITIONS],
}

impl FaintQueue {
    fn push(&mut self, position: Position) {
        if let Some(free) = self.positions.iter_mut().find(|entry| entry.is_none()) {
            *free = Some(position);
        }
    }

    fn is_empty(&self) -> bool {
        self.positions[0].is_none()
    }

    fn contains(&self, position: Position) -> bool {
        self.positions.contains(&Some(position))
    }

    fn take(&mut self) -> impl Iterator<Item = Position> + use<> {
        std::mem::take(&mut self.positions).into_iter().flatten()
    }
}

/// The speeds of the `runSwitch` actions queued so far, for [`Engine::queue_switch_in`].
#[derive(Default)]
struct QueuedSwitchIns {
    speeds: [u32; MAX_POSITIONS],
    len: usize,
}

pub(crate) struct Engine<'a> {
    dex: &'a Dex,
    state: &'a mut BattleState,
    events: &'a mut Vec<Event>,
    faint_queue: FaintQueue,
    /// The side of the last creature announced fainted without a win check after it.
    unchecked_faint: Option<SideId>,
    /// The `eachEvent` order while it has no tie, until a cached speed, an active creature, or
    /// a faint changes.
    each_event_order: Option<Positions>,
    /// Whether the move being used has had a Stellar boost, which lasts for all its hits
    /// (Showdown's `move.stellarBoosted`).
    stellar_boosted: bool,
    /// Whether the move in use was boosted by Prankster, which a move it calls keeps
    /// (Showdown's `move.pranksterBoosted`).
    prankster_boosted: bool,
    /// The move in use, which becomes [`BattleState::last_move`] when the action ends
    /// (Showdown's `activeMove`).
    active_move: Option<MoveId>,
    /// The move each position still has queued this turn (Showdown's `queue.willMove`).
    queued_moves: [Option<MoveId>; MAX_POSITIONS],
}

impl<'a> Engine<'a> {
    pub fn new(dex: &'a Dex, state: &'a mut BattleState, events: &'a mut Vec<Event>) -> Self {
        Self {
            dex,
            state,
            events,
            faint_queue: FaintQueue::default(),
            unchecked_faint: None,
            each_event_order: None,
            stellar_boosted: false,
            prankster_boosted: false,
            active_move: None,
            queued_moves: [None; MAX_POSITIONS],
        }
    }

    fn emit(&mut self, event: Event) {
        self.events.push(event);
    }

    #[inline]
    fn active(&self, side: Position) -> &Pokemon {
        let team = &self.state.sides[side.side.index()];
        &team.team[team.active[usize::from(side.index)].unwrap_or(0)]
    }

    #[inline]
    fn active_mut(&mut self, side: Position) -> &mut Pokemon {
        self.state.sides[side.side.index()].active_mut_at(side.index)
    }

    /// The positions in battle, in Showdown's order.
    #[inline]
    fn positions(&self) -> Positions {
        self.state.positions()
    }

    /// The foes of `position` that have not fainted, in position order (Showdown's
    /// `side.foes()`).
    pub(super) fn foes_of(&self, position: Position) -> Positions {
        self.positions()
            .iter()
            .filter(|other| other.side != position.side && !self.active(*other).is_fainted())
            .collect()
    }

    /// Whether two positions are adjacent in this battle; see [`Position::is_adjacent`].
    pub(super) fn adjacent(&self, position: Position, other: Position) -> bool {
        position.is_adjacent(other, self.state.game_type.active_per_half())
    }

    /// The foes of `position` that have not fainted and are adjacent to it (Showdown's
    /// `adjacentFoes`); in singles and doubles, every foe. In triples a fainted creature has no
    /// adjacent foes, since Showdown's `isAdjacent` rules out fainted creatures.
    pub(super) fn adjacent_foes(&self, position: Position) -> Positions {
        if self.state.game_type.active_per_half() > 2 && self.active(position).is_fainted() {
            return Positions::new();
        }
        self.foes_of(position)
            .iter()
            .filter(|&foe| self.adjacent(position, foe))
            .collect()
    }

    fn weather_id(&self) -> Option<WeatherId> {
        self.state.field.weather.map(|weather| weather.id)
    }

    fn weather(&self) -> Option<&'a WeatherData> {
        let dex = self.dex;
        self.weather_id().map(|id| dex.weather(id))
    }

    /// The kinds of handler the active creature's ability and item have.
    #[inline]
    fn mask(&self, side: Position) -> HandlerMask {
        self.active(side).mask
    }

    /// The active creature's handlers with the ability or item each comes from, ability first.
    fn handlers(&self, side: Position) -> impl Iterator<Item = (Effect, &'a Handler)> + use<'a> {
        let dex = self.dex;
        let pokemon = self.active(side);
        let ability = pokemon
            .ability
            .map(|id| (Effect::Ability(id), dex.ability(id).handlers.as_slice()));
        let item = pokemon
            .item
            .map(|id| (Effect::Item(id), dex.item(id).handlers.as_slice()));
        ability
            .into_iter()
            .chain(item)
            .flat_map(|(effect, handlers)| handlers.iter().map(move |handler| (effect, handler)))
    }

    /// Announces an ability or item taking effect (`-ability` or `-item`).
    fn announce(&mut self, side: Position, effect: Effect) {
        self.emit(match effect {
            Effect::Ability(ability) => Event::Ability {
                pokemon: side,
                ability,
            },
            Effect::Item(item) => Event::Item {
                pokemon: side,
                item,
            },
        });
    }

    pub fn start(&mut self) {
        self.sort_team_order();
        let positions = self.positions();
        let mut queued = QueuedSwitchIns::default();
        for position in positions.iter() {
            self.mark_switched_in(position);
            self.emit_switch(position);
            self.update_speed(position);
            self.queue_switch_in(&mut queued, position);
        }
        self.run_switch_in(positions);
        self.update();
        self.state.turn = 0;
        self.next_turn();
    }

    /// Runs validated choices, by [`Position::flat`]: replacements between turns, or a full
    /// turn.
    pub fn run(&mut self, choices: [Choice; MAX_POSITIONS]) {
        let positions = self.positions();
        // Showdown's `commitChoices` starts by updating every cached speed.
        self.update_speeds();
        if !self.state.awaiting_switch() {
            let queue = self.turn_queue(choices);
            self.run_queue(queue, false);
            return;
        }
        // Replacements switch in by the speed of the creatures they replace, each Showdown's
        // `instaswitch` action queuing its `runSwitch`; then one `runSwitch` takes them all.
        let mut switching: Positions = positions
            .iter()
            .filter(|position| matches!(choices[position.flat()], Choice::Switch(_)))
            .collect();
        self.sort_by_speed(switching.as_mut_slice());
        let mut queued = QueuedSwitchIns::default();
        for position in switching.iter() {
            if let Choice::Switch(slot) = choices[position.flat()] {
                self.switch_in(position, slot);
                self.update_speed(position);
                self.queue_switch_in(&mut queued, position);
            }
        }
        // Showdown's `runAction` skips the `Update` while another replacement is next.
        if switching.len() > 0 {
            self.update();
        }
        self.run_switch_in(switching);
        if self.faint_messages() {
            return;
        }
        self.update();
        // A mid-turn switch (after a move like U-turn) resumes the paused turn.
        match self.state.queue.take() {
            Some(paused) => {
                let queue = self.resumed_queue(paused);
                self.run_queue(queue, true);
            }
            None => self.next_turn(),
        }
    }

    fn action_for(&self, side: Position, choice: Choice) -> Option<QueuedAction> {
        match choice {
            Choice::Switch(slot) => Some(QueuedAction::Switch(slot)),
            Choice::Shift => Some(QueuedAction::Shift),
            Choice::Pass => None,
            _ => {
                let slot = choice.move_slot()?;
                let pokemon = self.active(side);
                // A rampage or a charged move keeps its target (Showdown's
                // `lockedMoveTargetLoc`).
                let target = if pokemon.volatiles.charging.is_some() {
                    pokemon.volatiles.charge_target
                } else if pokemon.forced_move().is_some() {
                    pokemon.volatiles.last_target
                } else {
                    choice.target()
                };
                // A validated move choice that is not selectable can only be Struggle's slot 0.
                let slot = pokemon.can_select_move(self.dex, slot).then_some(slot);
                Some(QueuedAction::Move {
                    slot,
                    target,
                    move_id: self.queued_move(side, slot),
                })
            }
        }
    }

    /// Showdown's `terastallize` action, after switches and before any move.
    fn terastallize(&mut self, side: Position) {
        self.state.sides[side.side.index()].can_terastallize = false;
        let pokemon = self.active_mut(side);
        pokemon.terastallized = true;
        let tera_type = pokemon.tera_type;
        self.emit(Event::Terastallize {
            pokemon: side,
            tera_type,
        });
        // The action's `Update`.
        self.update();
    }

    /// Showdown's team preview: each side's `team` actions, one per creature with priority
    /// falling by team slot, are sorted before the battle starts, which draws for creatures in
    /// the same slot with the same Speed. None is active yet, so none has its ability or item.
    fn sort_team_order(&mut self) {
        let mut keys = [(0_i8, 0_u32); MAX_SIDES * MAX_TEAM_SIZE];
        let mut count = 0;
        for side in &self.state.sides {
            for (slot, pokemon) in (0_i8..).zip(&side.team) {
                if let Some(key) = keys.get_mut(count) {
                    *key = (
                        -slot,
                        u32::from(pokemon.stats.speed) % (1 << ACTION_SPEED_BITS),
                    );
                    count += 1;
                }
            }
        }
        self.speed_sort(&mut keys[..count], |left, right| {
            right.0.cmp(&left.0).then(right.1.cmp(&left.1))
        });
    }

    /// The move a queued action uses: a forced move, the slot's move, or Struggle.
    fn queued_move(&self, side: Position, slot: Option<usize>) -> MoveId {
        let pokemon = self.active(side);
        pokemon
            .forced_move()
            .or_else(|| {
                slot.and_then(|slot| pokemon.move_slots[slot].map(|move_slot| move_slot.id))
            })
            .unwrap_or_else(|| self.dex.struggle())
    }

    /// Runs a position's queued action and the checks after it. Returns `None` if the turn
    /// stops here (the battle ended, or a creature must switch mid-turn and the rest of the
    /// queue waits in the state), or else whether the action ran: a fainted creature's shift
    /// or move is skipped.
    fn act(&mut self, side: Position, action: QueuedAction, queue: &mut Queue) -> Option<bool> {
        match action {
            QueuedAction::Switch(slot) => {
                // `BeforeSwitchOut` runs an `Update` for a creature switching out on its own.
                if !self.active(side).is_fainted() {
                    self.update();
                }
                self.switch_in(side, slot);
                self.update_speed(side);
                // The `switch` action's own `Update`, before its `runSwitch`.
                self.update();
                self.run_switch_in([side].into_iter().collect());
            }
            // A fainted creature's shift or move is skipped without even an `Update`.
            QueuedAction::Shift | QueuedAction::Move { .. } if self.active(side).is_fainted() => {
                return Some(false);
            }
            QueuedAction::Shift => {
                let center = Position::new(side.side, 1);
                self.swap_position(side, 1);
                queue.swap(side, center);
            }
            QueuedAction::Move { slot, target, .. } => {
                {
                    let others_will_act = queue.will_act();
                    self.queued_moves = queue.moves();
                    let drag = self.run_move(side, slot, target, others_will_act);
                    // Showdown's `clearActiveMove`: a move that got as far as being used is
                    // the battle's last move.
                    if let Some(move_id) = self.active_move.take() {
                        self.state.last_move = Some(move_id);
                    }
                    if let Some(target) = drag {
                        // Showdown's `runMove` checks faints and the win first, and the drag
                        // still runs once the battle has ended, its own faints unprocessed.
                        self.faint_messages();
                        self.drag_in(target, queue);
                    }
                }
            }
        }
        if self.faint_messages() {
            return None;
        }
        self.update();
        if self
            .state
            .sides
            .iter()
            .any(|team| team.switch_flag.contains(&true))
        {
            self.state.queue = Some(queue.paused());
            return None;
        }
        Some(true)
    }

    /// Showdown's `speedSort` over positions by fresh action speed: fastest first, with each
    /// group of equal speed shuffled, which draws `k - 1` numbers for a group of `k`.
    fn sort_by_speed(&mut self, positions: &mut [Position]) {
        match positions.len() {
            0 | 1 => {}
            // Most sorts are of two: one roll breaks a tie, as Showdown's shuffle does.
            2 => {
                let first = self.action_speed(positions[0]);
                let second = self.action_speed(positions[1]);
                if second > first || (second == first && self.state.prng.below(2) == 1) {
                    positions.swap(0, 1);
                }
            }
            _ => {
                let mut keyed = [(0, Position::from(SideId::P1)); MAX_POSITIONS];
                for (entry, &position) in keyed.iter_mut().zip(positions.iter()) {
                    *entry = (self.action_speed(position), position);
                }
                let keyed = &mut keyed[..positions.len()];
                self.speed_sort(keyed, |left, right| right.0.cmp(&left.0));
                for (position, &(_, sorted)) in positions.iter_mut().zip(keyed.iter()) {
                    *position = sorted;
                }
            }
        }
    }

    /// Showdown's `speedSort`: repeatedly moves the group that sorts first into place, and
    /// shuffles the group if it has more than one member. `compare` returns `Less` for what
    /// goes first.
    pub(super) fn speed_sort<T: Copy>(
        &mut self,
        list: &mut [T],
        compare: impl Fn(&T, &T) -> Ordering,
    ) {
        let mut sorted = 0;
        while sorted + 1 < list.len() {
            let mut group = [0; 32];
            group[0] = sorted;
            let mut size = 1;
            for index in sorted + 1..list.len() {
                match compare(&list[group[0]], &list[index]) {
                    Ordering::Less => {}
                    Ordering::Greater => {
                        group[0] = index;
                        size = 1;
                    }
                    Ordering::Equal => {
                        if let Some(slot) = group.get_mut(size) {
                            *slot = index;
                            size += 1;
                        }
                    }
                }
            }
            for (offset, &index) in group[..size].iter().enumerate() {
                if index != sorted + offset {
                    list.swap(sorted + offset, index);
                }
            }
            if size > 1 {
                self.shuffle(&mut list[sorted..sorted + size]);
            }
            sorted += size;
        }
    }

    /// Showdown's `insertChoice` for a `runSwitch` action: it goes after the queued ones that
    /// are faster, and among those as fast at a random place, which takes a roll.
    fn queue_switch_in(&mut self, queued: &mut QueuedSwitchIns, side: Position) {
        let speed = self.active(side).speed;
        let ties = queued.speeds[..queued.len]
            .iter()
            .filter(|&&queued| queued == speed)
            .count();
        if ties > 0 {
            self.state
                .prng
                .range(0, u32::try_from(ties).unwrap_or(0) + 1);
        }
        if let Some(entry) = queued.speeds.get_mut(queued.len) {
            *entry = speed;
            queued.len += 1;
        }
    }

    /// Numbers the creature at `side` as the latest to switch in.
    fn mark_switched_in(&mut self, side: Position) {
        let latest = self
            .state
            .sides
            .iter()
            .flat_map(|team| &team.team)
            .map(|pokemon| pokemon.switched_in)
            .max()
            .unwrap_or(0);
        self.active_mut(side).switched_in = latest + 1;
    }

    fn emit_switch(&mut self, side: Position) {
        let team = &self.state.sides[side.side.index()];
        let slot = team.active[usize::from(side.index)].unwrap_or(0);
        let pokemon = &team.team[slot];
        let event = Event::Switch {
            pokemon: side,
            slot,
            species: pokemon.species,
            hp: pokemon.hp,
            max_hp: pokemon.max_hp(),
        };
        self.emit(event);
    }

    /// Showdown's `swapPosition`: the creature at `side` trades places with the one at `to`
    /// on its side, along with its place in `switch_order`.
    fn swap_position(&mut self, side: Position, to: u8) {
        let to = Position::new(side.side, to);
        self.emit(Event::Swap { pokemon: side, to });
        let (from, into) = (usize::from(side.index), usize::from(to.index));
        self.each_event_order = None;
        let team = &mut self.state.sides[side.side.index()];
        team.active.swap(from, into);
        team.switch_flag.swap(from, into);
        team.switch_order.swap(from, into);
    }

    /// In triples, when each side has one creature left and they are not adjacent, both move
    /// to the center (Showdown's `nextTurn`).
    fn center_last_creatures(&mut self) {
        if self.state.game_type != GameType::Triples
            || self.state.sides.iter().any(|side| {
                side.team
                    .iter()
                    .filter(|pokemon| !pokemon.is_fainted())
                    .count()
                    != 1
            })
        {
            return;
        }
        let standing: Positions = self
            .positions()
            .iter()
            .filter(|&position| !self.active(position).is_fainted())
            .collect();
        if let [first, second] = *standing.as_slice()
            && !self.adjacent(first, second)
        {
            self.swap_position(first, 1);
            self.swap_position(second, 1);
            self.emit(Event::Center);
        }
    }

    fn switch_in(&mut self, side: Position, slot: usize) {
        let index = usize::from(side.index);
        let passing = self.state.side(side.side).baton_pass[index];
        let outgoing = self.active_mut(side);
        // Baton Pass: stat stages and volatiles go to the replacement, except Showdown's
        // `noCopy` ones (a choice lock, Encore, Disable) and what it remembers of its moves.
        let passed = (passing && !outgoing.is_fainted()).then_some((
            outgoing.boosts,
            Volatiles {
                choice_lock: None,
                struggle_lock: false,
                encore: None,
                disable: None,
                last_move: None,
                last_target: None,
                ..outgoing.volatiles
            },
        ));
        outgoing.boosts = Boosts::default();
        outgoing.volatiles = Volatiles::default();
        // Showdown's `clearVolatile` resets the cached speed to the Speed stat; a creature
        // dragged in keeps that until the next `updateSpeed`.
        outgoing.speed = u32::from(outgoing.stats.speed);
        self.each_event_order = None;
        let team = &mut self.state.sides[side.side.index()];
        team.baton_pass[index] = false;
        team.active[index] = Some(slot);
        team.switch_flag[index] = false;
        // Showdown swaps the incoming creature into the position's place in `side.pokemon`.
        if let Some(place) = team.switch_order.iter().position(|&member| member == slot) {
            team.switch_order.swap(index, place);
        }
        let incoming = team.active_mut_at(side.index);
        incoming.active_turns = 0;
        incoming.status_state.stage = 0;
        if let Some((boosts, volatiles)) = passed {
            incoming.boosts = boosts;
            incoming.volatiles = volatiles;
        }
        self.mark_switched_in(side);
        self.emit_switch(side);
    }

    /// Showdown's `dragIn`: a forced switch picks a random replacement from
    /// `possibleSwitches`, cancels the dragged-out creature's action, and runs the switch-in.
    fn drag_in(&mut self, side: Position, queue: &mut Queue) {
        let candidates: Vec<usize> = self.state.side(side.side).drag_candidates().collect();
        let Ok(count) = u32::try_from(candidates.len()) else {
            return;
        };
        if count == 0 || self.active(side).is_fainted() {
            return;
        }
        let index = usize::try_from(self.state.prng.below(count)).unwrap_or(0);
        self.switch_in(side, candidates[index]);
        queue.cancel(side);
        self.run_switch_in([side].into_iter().collect());
    }

    /// Whether the creature touches the ground: not immune to `grounded_type` by the type chart
    /// or an `immunity` handler (Showdown's `isGrounded`), and not in the air mid-charge.
    fn is_grounded(&self, side: Position, grounded_type: crate::dex::TypeId) -> bool {
        let pokemon = self.active(side);
        let immune_by_handler = self.mask(side).intersects(HandlerMask::TRY_HIT)
            && self
                .handlers(side)
                .any(|(_, handler)| *handler == Handler::Immunity(grounded_type));
        !immune_by_handler
            && self
                .dex
                .type_modifier(grounded_type, pokemon.types())
                .is_some()
    }

    /// Whether the creature is out of reach while charging a move like Fly.
    fn is_semi_invulnerable(&self, side: Position) -> bool {
        let pokemon = self.active(side);
        pokemon.volatiles.charging.is_some_and(|move_id| {
            self.dex
                .move_data(move_id)
                .charge
                .as_ref()
                .is_some_and(|charge| charge.semi_invulnerable)
        })
    }

    /// The terrain, if `relevant` says it matters here and the creature is grounded and so
    /// affected by it. Grounding is only worked out when the terrain is relevant.
    fn terrain_affecting(
        &self,
        side: Position,
        relevant: impl Fn(&crate::dex::TerrainData) -> bool,
    ) -> Option<&'a crate::dex::TerrainData> {
        let dex = self.dex;
        let terrain = dex.terrain(self.state.field.terrain?.id);
        (relevant(terrain)
            && self.is_grounded(side, terrain.grounded_type)
            && !self.is_semi_invulnerable(side))
        .then_some(terrain)
    }

    fn set_terrain(&mut self, id: crate::dex::TerrainId) -> bool {
        if self
            .state
            .field
            .terrain
            .is_some_and(|terrain| terrain.id == id)
        {
            return false;
        }
        self.state.field.terrain = Some(super::state::TerrainState {
            id,
            duration: self.dex.terrain(id).duration,
        });
        self.emit(Event::Terrain { terrain: Some(id) });
        // `eachEvent('TerrainChange')`.
        self.each_event();
        true
    }

    /// Showdown's `addPseudoWeather`: starts it, or, when it is already in effect, ends it if
    /// it ends when repeated (Trick Room's `onFieldRestart`) and fails otherwise.
    fn add_pseudo_weather(&mut self, id: PseudoWeatherId) -> bool {
        let field = &mut self.state.field.pseudo_weathers;
        if let Some(index) = field.iter().position(|state| state.id == id) {
            if !self.dex.pseudo_weather(id).ends_when_repeated {
                return false;
            }
            field.remove(index);
            self.emit(Event::PseudoWeatherEnd { pseudo_weather: id });
            return true;
        }
        field.push(PseudoWeatherState {
            id,
            duration: self.dex.pseudo_weather(id).duration,
        });
        self.emit(Event::PseudoWeatherStart { pseudo_weather: id });
        true
    }

    /// Whether a pseudo-weather in effect reverses speed, like Trick Room.
    pub(super) fn speed_reversed(&self) -> bool {
        self.state
            .field
            .pseudo_weathers
            .iter()
            .any(|state| self.dex.pseudo_weather(state.id).reverses_speed)
    }

    fn clear_terrain(&mut self) -> bool {
        if self.state.field.terrain.take().is_none() {
            return false;
        }
        self.emit(Event::Terrain { terrain: None });
        self.each_event();
        true
    }

    /// Runs `onStart` abilities and items for creatures that just switched in, fastest first.
    fn run_switch_in(&mut self, entering: Positions) {
        // Showdown's `runSwitch` sorts every active creature, fainted ones included, by cached
        // speed; a switch-in handler's speed is then lowered by a fraction of its holder's
        // place in that order, which breaks speed ties among the creatures switching in.
        let mut all = [(0, Position::from(SideId::P1)); MAX_POSITIONS];
        let mut count = 0;
        for position in self.positions() {
            all[count] = (self.active(position).speed, position);
            count += 1;
        }
        let all = &mut all[..count];
        self.speed_sort(all, |left, right| right.0.cmp(&left.0));
        let order: Positions = all
            .iter()
            .map(|&(_, position)| position)
            .filter(|position| entering.as_slice().contains(position))
            .collect();
        // Showdown's `fieldEvent('SwitchIn')`: each creature's handlers in speed order, its
        // entry hazards (sub-order 4, in the order they were set) before its ability (7) and
        // item (8), with a faint check after each, so a battle can end here.
        for side in order.iter() {
            if self.entry_hazards(side) {
                return;
            }
            if self.active(side).is_fainted() || !self.mask(side).intersects(HandlerMask::START) {
                continue;
            }
            for (effect, handler) in self.handlers(side) {
                match handler {
                    Handler::StartWeather(weather) => {
                        if self.weather_id() != Some(*weather) {
                            self.announce(side, effect);
                            self.set_weather(*weather);
                        }
                    }
                    Handler::StartTerrain(terrain) => {
                        if self.state.field.terrain.map(|state| state.id) != Some(*terrain) {
                            self.announce(side, effect);
                            self.set_terrain(*terrain);
                        }
                    }
                    // Like Intimidate: every adjacent foe, announced once, and blocked by a
                    // substitute.
                    Handler::StartFoeBoosts(boosts) => {
                        let foes = self.adjacent_foes(side);
                        if foes.len() > 0 {
                            self.announce(side, effect);
                        }
                        for foe in foes.iter() {
                            if self.active(foe).volatiles.substitute.is_some() {
                                self.emit(Event::Immune { pokemon: foe });
                            } else {
                                self.boost(foe, *boosts);
                            }
                        }
                    }
                    _ => continue,
                }
                if self.faint_messages() {
                    return;
                }
            }
        }
    }

    /// The side's entry hazards acting on a creature that just switched in, in the order they
    /// were set: damage, a status, or stat stages, each damage followed by a faint check.
    /// Returns whether the battle ended.
    fn entry_hazards(&mut self, side: Position) -> bool {
        let dex = self.dex;
        let mut index = 0;
        while let Some(&condition) = self.state.side(side.side).conditions.get(index) {
            index += 1;
            if self.active(side).is_fainted() {
                return false;
            }
            let data = dex.side_condition(condition.id);
            if let Some(hazard) = &data.switch_in_damage
                && self.hazard_damage(side, condition, hazard)
            {
                return true;
            }
            if let Some(hazard) = &data.switch_in_status
                && self.hazard_status(side, condition, hazard)
            {
                // Absorbed, like Toxic Spikes by a Poison type: the next one moved up.
                index -= 1;
            }
            if let Some(hazard) = &data.switch_in_boosts
                && hazard
                    .grounded_type
                    .is_none_or(|grounded_type| self.is_grounded(side, grounded_type))
            {
                self.emit(Event::SideActivate {
                    side: side.side,
                    condition: condition.id,
                });
                self.boost(side, hazard.boosts);
            }
        }
        false
    }

    /// A hazard's damage, like Stealth Rock's. Returns whether the battle ended.
    fn hazard_damage(
        &mut self,
        side: Position,
        condition: SideConditionState,
        hazard: &SwitchInDamage,
    ) -> bool {
        let dex = self.dex;
        if hazard
            .grounded_type
            .is_some_and(|grounded_type| !self.is_grounded(side, grounded_type))
        {
            return false;
        }
        let pokemon = self.active(side);
        let layer = usize::from(condition.layers.max(1)) - 1;
        let fraction = hazard.layers[layer.min(hazard.layers.len() - 1)];
        // Showdown ignores immunities here: `runEffectiveness`, clamped to ±6.
        let effectiveness = hazard.type_id.map_or(0, |type_id| {
            pokemon
                .types()
                .map(|defender| dex.type_modifier(type_id, [defender]).unwrap_or(0))
                .sum::<i8>()
                .clamp(-6, 6)
        });
        let scaled = u64::from(pokemon.max_hp()) * u64::from(fraction.numerator);
        let divisor = u64::from(fraction.denominator);
        let shift = u32::from(effectiveness.unsigned_abs());
        let amount = if effectiveness >= 0 {
            (scaled << shift) / divisor
        } else {
            scaled / (divisor << shift)
        };
        let amount = u32::try_from(amount).unwrap_or(u32::MAX).max(1);
        self.damage(side, amount, DamageSource::Hazard(condition.id));
        self.faint_messages()
    }

    /// A hazard's status, like Toxic Spikes': poison by layer, unless the creature is of a type
    /// that ignores it, or one that absorbs it. Returns whether the hazard was absorbed.
    fn hazard_status(
        &mut self,
        side: Position,
        condition: SideConditionState,
        hazard: &SwitchInStatus,
    ) -> bool {
        if hazard
            .grounded_type
            .is_some_and(|grounded_type| !self.is_grounded(side, grounded_type))
        {
            return false;
        }
        let has_type = |engine: &Self, wanted: TypeId| {
            engine.active(side).types().any(|type_id| type_id == wanted)
        };
        if hazard
            .absorbed_by
            .is_some_and(|absorber| has_type(self, absorber))
        {
            let conditions = &mut self.state.sides[side.side.index()].conditions;
            conditions.retain(|state| state.id != condition.id);
            self.emit(Event::SideEnd {
                side: side.side,
                condition: condition.id,
            });
            return true;
        }
        if hazard
            .ignored_by
            .iter()
            .any(|&ignored| has_type(self, ignored))
        {
            return false;
        }
        let layer = usize::from(condition.layers.max(1)) - 1;
        let status = hazard.layers[layer.min(hazard.layers.len() - 1)];
        self.set_status(side, status);
        false
    }

    /// Showdown's `updateSpeed`: every active creature that has not fainted caches its
    /// action speed.
    pub(super) fn update_speeds(&mut self) {
        let sides = self.state.sides.len();
        for side in SideId::ALL.into_iter().take(sides) {
            for (index, slot) in (0_u8..).zip(0..self.state.game_type.active_per_side()) {
                let position = Position::new(side, index);
                let team = self.state.side(side);
                if team.active[slot].is_some_and(|slot| !team.team[slot].is_fainted()) {
                    self.update_speed(position);
                }
            }
        }
    }

    /// Showdown's `pokemon.updateSpeed`, which `insertChoice` runs for a creature switching in.
    fn update_speed(&mut self, side: Position) {
        let speed = self.action_speed(side);
        let cached = &mut self.active_mut(side).speed;
        if *cached != speed {
            *cached = speed;
            self.each_event_order = None;
        }
    }

    /// Showdown's `eachEvent` order: the active creatures that have not fainted, by cached
    /// speed, each tie shuffled with Showdown's draws even where the order changes nothing.
    pub(super) fn each_event(&mut self) -> Positions {
        if let Some(order) = self.each_event_order {
            return order;
        }
        let mut keyed = [(0, Position::from(SideId::P1)); MAX_POSITIONS];
        let mut count = 0;
        for (side, team) in SideId::ALL.into_iter().zip(&self.state.sides) {
            for (index, slot) in (0_u8..).zip(team.active) {
                let Some(slot) = slot else { continue };
                let pokemon = &team.team[slot];
                let position = Position::new(side, index);
                // A creature at 0 HP still counts until `faintMessages` marks it fainted.
                if !pokemon.is_fainted() || self.faint_queue.contains(position) {
                    keyed[count] = (pokemon.speed, position);
                    count += 1;
                }
            }
        }
        let keyed = &mut keyed[..count];
        let tied =
            (1..count).any(|index| keyed[..index].iter().any(|entry| entry.0 == keyed[index].0));
        if tied {
            self.speed_sort(keyed, |left, right| right.0.cmp(&left.0));
            return keyed.iter().map(|&(_, side)| side).collect();
        }
        // Without a tie, the selection sort's order is the plain sorted order, and it stays
        // the same until something it depends on changes.
        keyed.sort_unstable_by_key(|&(speed, _)| std::cmp::Reverse(speed));
        let order: Positions = keyed.iter().map(|&(_, side)| side).collect();
        self.each_event_order = Some(order);
        order
    }

    /// Showdown's `Update` event, in `eachEvent` order: items that react to HP or status get a
    /// chance to trigger.
    fn update(&mut self) {
        for side in self.each_event() {
            if !self.mask(side).intersects(HandlerMask::UPDATE) || self.active(side).is_fainted() {
                continue;
            }
            for (effect, handler) in self.handlers(side) {
                // A one-shot handler may have used the item up earlier in this loop.
                if !self.holds(side, effect) {
                    continue;
                }
                match *handler {
                    Handler::HealAtThreshold { threshold, amount } => {
                        let pokemon = self.active(side);
                        if threshold.covers(pokemon.hp, pokemon.max_hp()) && !pokemon.is_fainted() {
                            let restore = amount.of_floored(u32::from(pokemon.max_hp())).max(1);
                            self.trigger(side, effect);
                            self.heal(side, restore, HealSource::Effect(effect));
                        }
                    }
                    Handler::CureStatus => {
                        let pokemon = self.active(side);
                        if pokemon.status.is_some() || pokemon.volatiles.confusion.is_some() {
                            self.cure(side, effect);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    /// A `cureStatus` handler: removes the status and confusion.
    fn cure(&mut self, side: Position, effect: Effect) {
        self.trigger(side, effect);
        self.cure_status(side);
        if self.active(side).volatiles.confusion.is_some() {
            self.active_mut(side).volatiles.confusion = None;
            self.emit(Event::End {
                pokemon: side,
                volatile: crate::dex::VolatileStatus::Confusion,
            });
        }
    }

    /// Whether the active creature still has the ability or item.
    fn holds(&self, side: Position, effect: Effect) -> bool {
        let pokemon = self.active(side);
        match effect {
            Effect::Ability(ability) => pokemon.ability == Some(ability),
            Effect::Item(item) => pokemon.item == Some(item),
        }
    }

    /// Reports a one-shot handler triggering. A consumable item is used up and only
    /// `-enditem` is sent, as Showdown does for berries and Focus Sash; anything else is
    /// announced with `-ability` or `-item`.
    fn trigger(&mut self, side: Position, effect: Effect) {
        match effect {
            Effect::Item(item) if self.dex.item(item).consumable => {
                let dex = self.dex;
                let holder = self.active_mut(side);
                holder.item = None;
                holder.refresh_mask(dex);
                self.emit(Event::EndItem {
                    pokemon: side,
                    item,
                });
            }
            _ => self.announce(side, effect),
        }
    }

    fn set_weather(&mut self, id: WeatherId) -> bool {
        if self.weather_id() == Some(id) {
            return false;
        }
        self.state.field.weather = Some(WeatherState {
            id,
            duration: self.dex.weather(id).duration,
        });
        self.emit(Event::Weather { weather: Some(id) });
        // `eachEvent('WeatherChange')`.
        self.each_event();
        true
    }

    /// Applies stat stages and returns whether any changed.
    fn boost(&mut self, side: Position, boosts: Boosts) -> bool {
        if self.active(side).is_fainted() || !self.foes_left(side.side) {
            return false;
        }
        let mut changed = false;
        for (stat, stages) in boosts.changes() {
            changed |= self.boost_stat(side, stat, stages);
        }
        changed
    }

    /// Showdown's `foePokemonLeft`, which stat changes need: whether any foe still has a
    /// creature, counting one whose faint has yet to be processed.
    fn foes_left(&self, side: SideId) -> bool {
        let pending = self.faint_queue.positions;
        self.state.side_ids().filter(|&foe| foe != side).any(|foe| {
            !self.state.side(foe).is_defeated()
                || pending
                    .iter()
                    .flatten()
                    .any(|position| position.side == foe)
        })
    }

    fn boost_stat(&mut self, side: Position, stat: BoostStat, stages: i8) -> bool {
        let applied = self.active_mut(side).boosts.apply(stat, stages);
        if applied != 0 {
            self.emit(Event::Boost {
                pokemon: side,
                stat,
                stages: applied,
            });
        }
        applied != 0
    }

    fn cure_status(&mut self, side: Position) {
        if let Some(status) = self.active_mut(side).status.take() {
            self.emit(Event::CureStatus {
                pokemon: side,
                status,
            });
        }
    }

    /// Removes up to `amount` HP and returns how much was actually lost.
    ///
    /// Damage from a move or confusion that would knock out a creature at full HP is first
    /// offered to `endureFromFull` handlers, ability before item, like Showdown's `onDamage`.
    fn damage(&mut self, side: Position, amount: u32, from: DamageSource) -> u32 {
        let pokemon = self.active(side);
        if pokemon.is_fainted() || amount == 0 {
            return 0;
        }
        let mut amount = amount;
        let from_move = matches!(from, DamageSource::Move | DamageSource::Confusion);
        if from_move
            && pokemon.hp == pokemon.max_hp()
            && amount >= u32::from(pokemon.hp)
            && self.mask(side).intersects(HandlerMask::DAMAGE)
        {
            let endure = self
                .handlers(side)
                .find(|(_, handler)| **handler == Handler::EndureFromFull)
                .map(|(effect, _)| effect);
            if let Some(effect) = endure {
                self.trigger(side, effect);
                amount = u32::from(self.active(side).hp - 1);
                if amount == 0 {
                    return 0;
                }
            }
        }
        let pokemon = self.active_mut(side);
        let dealt = saturate_u16(amount).min(pokemon.hp);
        pokemon.hp -= dealt;
        let hp = pokemon.hp;
        self.emit(Event::Damage {
            pokemon: side,
            amount: dealt,
            hp,
            from,
        });
        if hp == 0 {
            self.faint_queue.push(side);
            self.each_event_order = None;
        }
        u32::from(dealt)
    }

    /// Restores up to `amount` HP and returns how much was actually restored.
    fn heal(&mut self, side: Position, amount: u32, from: HealSource) -> u32 {
        let pokemon = self.active_mut(side);
        if pokemon.is_fainted() {
            return 0;
        }
        let restored = saturate_u16(amount).min(pokemon.max_hp() - pokemon.hp);
        if restored == 0 {
            return 0;
        }
        pokemon.hp += restored;
        let hp = pokemon.hp;
        self.emit(Event::Heal {
            pokemon: side,
            amount: restored,
            hp,
            from,
        });
        u32::from(restored)
    }

    /// Showdown's `faintMessages`: announces queued faints and ends the battle if a side is
    /// out of creatures. Returns whether the battle ended.
    ///
    /// When both sides run out at once, the side whose creature fainted last wins, as in
    /// Generation 5 onward (for example, an attacker knocked out by its own recoil).
    fn faint_messages(&mut self) -> bool {
        self.announce_faints(true)
    }

    /// `faintMessages`, checking for a win only when `check_win` is set; otherwise the next
    /// call checks. Showdown's hit loop checks only if the attacker fainted, and `runMove`
    /// checks afterwards either way.
    pub(super) fn announce_faints(&mut self, check_win: bool) -> bool {
        if self.state.outcome.is_some() {
            return true;
        }
        if self.faint_queue.is_empty() && self.unchecked_faint.is_none() {
            return false;
        }
        let mut last_fainted = self.unchecked_faint.take();
        for side in self.faint_queue.take() {
            self.emit(Event::Faint { pokemon: side });
            // Showdown's `faintMessages`: stat stages, volatiles, and Terastallization go.
            let fainted = self.active_mut(side);
            fainted.boosts = Boosts::default();
            fainted.volatiles = Volatiles::default();
            fainted.terastallized = false;
            fainted.speed = u32::from(fainted.stats.speed);
            self.each_event_order = None;
            last_fainted = Some(side.side);
        }
        if last_fainted.is_none() {
            return false;
        }
        if !check_win {
            self.unchecked_faint = last_fainted;
            return false;
        }
        // Showdown's `checkWin`: a side wins once every other side is out, and when all are
        // out at once, the side of the creature that fainted last wins.
        let mut standing = self
            .state
            .side_ids()
            .filter(|&side| !self.state.side(side).is_defeated());
        let outcome = match (standing.next(), standing.next()) {
            (None, _) => last_fainted.map_or(Outcome::Tie, Outcome::Win),
            (Some(winner), None) => Outcome::Win(winner),
            (Some(_), Some(_)) => return false,
        };
        self.state.outcome = Some(outcome);
        self.emit(match outcome {
            Outcome::Win(side) => Event::Win { side },
            Outcome::Tie => Event::Tie,
        });
        true
    }

    /// Starts the next turn unless the battle is over or a side must first switch in a
    /// replacement. Like Showdown, the turn counter and `activeTurns` advance only then.
    fn next_turn(&mut self) {
        if self.state.outcome.is_some() || self.state.awaiting_switch() {
            return;
        }
        // Showdown's `DisableMove` event for each active creature sorts its handlers. Its
        // volatiles that restrict moves (a choice lock, Taunt, Encore, Disable) tie with one
        // another, so with two or more Showdown shuffles them, one draw past the first. A lock
        // on Struggle then drops itself.
        for side in self.positions().iter() {
            let pokemon = self.active(side);
            let volatiles = &pokemon.volatiles;
            let restrictions = [
                volatiles.choice_lock.is_some() || volatiles.struggle_lock,
                volatiles.taunt.is_some(),
                volatiles.encore.is_some(),
                volatiles.disable.is_some(),
            ]
            .into_iter()
            .filter(|&present| present)
            .count();
            if !pokemon.is_fainted() && restrictions > 1 {
                let mut tied = [(); 4];
                self.shuffle(&mut tied[..restrictions]);
            }
            // A lock on Struggle drops itself, as does one whose holder lost its choice item.
            let holds_choice = self.mask(side).intersects(HandlerMask::CHOICE_LOCK);
            let volatiles = &mut self.active_mut(side).volatiles;
            volatiles.struggle_lock = false;
            if !holds_choice {
                volatiles.choice_lock = None;
            }
        }
        for side in self.positions().iter() {
            let active = self.active_mut(side);
            active.active_turns = active.active_turns.saturating_add(1);
        }
        self.center_last_creatures();
        self.state.turn = self.state.turn.saturating_add(1);
        let turn = self.state.turn;
        self.emit(Event::Turn { turn });
    }

    fn status_damage(status: Status, max_hp: u32, stage: u8) -> u32 {
        match status {
            Status::Burn => (max_hp / 16).max(1),
            Status::Poison => (max_hp / 8).max(1),
            Status::Toxic => (max_hp / 16).max(1) * u32::from(stage),
            Status::Paralysis | Status::Sleep | Status::Freeze => 0,
        }
    }
}
