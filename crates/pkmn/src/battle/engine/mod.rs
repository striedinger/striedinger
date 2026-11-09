//! Turn resolution. The engine borrows the content and the state separately, so content can
//! be read while the state is mutated.
//!
//! Ordering and random-number consumption follow Pokémon Showdown's Generation 9 simulator, so
//! both can be driven from the same seed and compared roll for roll. Handler lookups are gated
//! by each creature's [`HandlerMask`], so creatures without a relevant ability or item cost
//! nothing extra.

mod modifiers;
mod moves;
mod residual;

use std::cmp::Ordering;

use super::events::{DamageSource, Effect, Event, HealSource};
use super::request::Choice;
use super::state::{
    BattleState, GameType, MAX_POSITIONS, Outcome, Pokemon, Position, Positions,
    PseudoWeatherState, QueuedAction, SideConditionState, SideId, Volatiles, WeatherState,
};
use crate::dex::{Dex, Handler, HandlerMask, Status, WeatherData, WeatherId};
use crate::dex::{MoveId, PseudoWeatherId, SwitchInDamage, SwitchInStatus, TypeId};
use crate::stats::{BoostStat, Boosts, saturate_u16};

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

    fn take(&mut self) -> impl Iterator<Item = Position> + use<> {
        std::mem::take(&mut self.positions).into_iter().flatten()
    }
}

pub(crate) struct Engine<'a> {
    dex: &'a Dex,
    state: &'a mut BattleState,
    events: &'a mut Vec<Event>,
    faint_queue: FaintQueue,
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
        let positions = self.positions();
        for position in positions.iter() {
            self.emit_switch(position);
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
        if !self.state.awaiting_switch() {
            let mut queue = [None; MAX_POSITIONS];
            for position in positions.iter() {
                queue[position.flat()] = self.action_for(position, choices[position.flat()]);
            }
            if self.state.game_type.active_per_half() > 1 {
                self.resolve_targets(&mut queue);
            }
            // With a shift queued, the turn-start order matters: Showdown keeps it until a
            // move heads the queue (see `continue_turn`).
            let old_order = queue
                .contains(&Some(QueuedAction::Shift))
                .then(|| self.queue_order(queue, None));
            if choices.iter().any(|choice| choice.terastallizes()) {
                // Showdown's queue order: switches (103), then Terastallization (106), then
                // moves.
                while let Some(position) = old_order
                    .and_then(|order| {
                        order.iter().find(|position| {
                            matches!(queue[position.flat()], Some(QueuedAction::Switch(_)))
                        })
                    })
                    .or_else(|| self.next_actor(&queue, true))
                {
                    if self.act(position, &mut queue) {
                        return;
                    }
                }
                self.terastallize(choices);
            }
            self.continue_turn(queue, old_order);
            return;
        }
        let mut switched = Positions::new();
        for position in positions.iter() {
            if let Choice::Switch(slot) = choices[position.flat()] {
                self.switch_in(position, slot);
                switched.push(position);
            }
        }
        self.run_switch_in(switched);
        if self.faint_messages() {
            return;
        }
        self.update();
        // A mid-turn switch (after a move like U-turn) resumes the paused turn.
        match self.state.queue.take() {
            Some(queue) => self.continue_turn(queue, None),
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

    /// Showdown's `terastallize` actions (queue order 106): after switches and before any move,
    /// fastest first.
    fn terastallize(&mut self, choices: [Choice; MAX_POSITIONS]) {
        let wanting = self
            .positions()
            .iter()
            .filter(|position| choices[position.flat()].terastallizes());
        let mut order: Positions = wanting.collect();
        self.sort_by_speed(order.as_mut_slice());
        for side in order.iter() {
            self.state.sides[side.side.index()].can_terastallize = false;
            let pokemon = self.active_mut(side);
            pokemon.terastallized = true;
            let tera_type = pokemon.tera_type;
            self.emit(Event::Terastallize {
                pokemon: side,
                tera_type,
            });
        }
    }

    /// Runs queued actions until the turn ends, the battle ends, or a creature must switch
    /// mid-turn, in which case the rest of the queue waits in the state.
    fn continue_turn(
        &mut self,
        mut queue: [Option<QueuedAction>; MAX_POSITIONS],
        mut old_order: Option<Positions>,
    ) {
        // The next actor is picked from the remaining actions each time, re-reading speed after
        // every action as Generation 8 onward does. Showdown re-sorts the queue after an
        // action that ran only when the head of the old order is a move, resolving every
        // queued move's target again; a fainted creature's skipped move or shift re-sorts
        // nothing. Only a shift, in triples, can make the old head and the next actor differ,
        // so the old order is kept only while the queue holds one.
        let mut ran = true;
        loop {
            let head = old_order
                .as_ref()
                .and_then(|order| order.iter().find(|head| queue[head.flat()].is_some()));
            // A switch or shift at the head of the old order runs without a re-sort.
            let stale = head.filter(|head| {
                !ran || !matches!(queue[head.flat()], Some(QueuedAction::Move { .. }))
            });
            let Some(side) = stale.or_else(|| self.next_actor(&queue, false)) else {
                break;
            };
            let action = queue[side.flat()];
            let is_move = matches!(action, Some(QueuedAction::Move { .. }));
            if stale.is_none() {
                let head_is_move = head.map_or(is_move, |head| {
                    matches!(queue[head.flat()], Some(QueuedAction::Move { .. }))
                });
                if ran && head_is_move && self.state.game_type.active_per_half() > 1 {
                    self.redraw_targets(&queue);
                }
                old_order = queue
                    .contains(&Some(QueuedAction::Shift))
                    .then(|| self.queue_order(queue, Some(side)));
            }
            let skippable = is_move || action == Some(QueuedAction::Shift);
            ran = !(skippable && self.active(side).is_fainted());
            // A shift trades places, and queued actions, with the center.
            let center = Position::new(side.side, 1);
            let shifts = action == Some(QueuedAction::Shift) && !self.active(side).is_fainted();
            if self.act(side, &mut queue) {
                return;
            }
            if shifts && let Some(order) = old_order.as_mut() {
                for position in order.as_mut_slice() {
                    if *position == center {
                        *position = side;
                    } else if *position == side {
                        *position = center;
                    }
                }
            }
        }
        self.residual();
    }

    /// The order the queue runs in, apart from `first`, as Showdown's sort leaves it.
    fn queue_order(
        &mut self,
        mut queue: [Option<QueuedAction>; MAX_POSITIONS],
        first: Option<Position>,
    ) -> Positions {
        if let Some(first) = first {
            queue[first.flat()] = None;
        }
        let mut order = Positions::new();
        while let Some(next) = self.next_actor(&queue, false) {
            queue[next.flat()] = None;
            order.push(next);
        }
        order
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

    /// Showdown's `resolveAction` for each move choice, in choice order: a move with no target
    /// location gets a random one, and `getActionSpeed` then resolves the target, either of
    /// which can draw in doubles.
    fn resolve_targets(&mut self, queue: &mut [Option<QueuedAction>; MAX_POSITIONS]) {
        for position in self.positions() {
            let Some(QueuedAction::Move {
                slot,
                target,
                move_id,
            }) = queue[position.flat()]
            else {
                continue;
            };
            let move_data = self.dex.move_data(move_id);
            let target = target.or_else(|| {
                let chosen = self.get_random_target(position, move_data);
                Some(position.target_location(chosen))
            });
            queue[position.flat()] = Some(QueuedAction::Move {
                slot,
                target,
                move_id,
            });
            self.get_target(position, move_data, target);
        }
    }

    /// Before each move in doubles, Showdown re-reads every queued action's speed, and so
    /// resolves each queued move's target again, drawing for those that fall back to a random
    /// foe (Showdown's `getActionSpeed` in `runAction`).
    fn redraw_targets(&mut self, queue: &[Option<QueuedAction>; MAX_POSITIONS]) {
        for position in self.positions() {
            if let Some(QueuedAction::Move {
                target, move_id, ..
            }) = queue[position.flat()]
            {
                let move_data = self.dex.move_data(move_id);
                self.get_target(position, move_data, target);
            }
        }
    }

    /// Runs a position's queued action and the checks after it. Returns whether the turn
    /// stops here: the battle ended, or a creature must switch mid-turn and the rest of the
    /// queue waits in the state.
    fn act(&mut self, side: Position, queue: &mut [Option<QueuedAction>; MAX_POSITIONS]) -> bool {
        let Some(action) = queue[side.flat()].take() else {
            return false;
        };
        match action {
            QueuedAction::Switch(slot) => {
                self.switch_in(side, slot);
                self.run_switch_in([side].into_iter().collect());
            }
            QueuedAction::Shift => {
                if !self.active(side).is_fainted() {
                    self.swap_position(side, 1, queue);
                }
            }
            QueuedAction::Move { slot, target, .. } => {
                if !self.active(side).is_fainted() {
                    let others_will_act = queue.iter().any(Option::is_some);
                    self.queued_moves = queue.map(|action| match action {
                        Some(QueuedAction::Move { move_id, .. }) => Some(move_id),
                        _ => None,
                    });
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
            return true;
        }
        self.update();
        if self
            .state
            .sides
            .iter()
            .any(|team| team.switch_flag.contains(&true))
        {
            self.state.queue = Some(*queue);
            return true;
        }
        false
    }

    fn priority(&self, side: Position, action: QueuedAction) -> i8 {
        match action {
            QueuedAction::Switch(_) | QueuedAction::Shift => 0,
            QueuedAction::Move { move_id, .. } => {
                self.move_priority(side, self.dex.move_data(move_id)).0
            }
        }
    }

    /// The position whose queued action runs next: switches first, then by priority, then by
    /// speed, as Showdown sorts its queue. With `switches_only`, only switches are considered.
    fn next_actor(
        &mut self,
        queue: &[Option<QueuedAction>; MAX_POSITIONS],
        switches_only: bool,
    ) -> Option<Position> {
        let mut waiting = Positions::new();
        for position in self.positions() {
            if queue[position.flat()]
                .is_some_and(|action| !switches_only || matches!(action, QueuedAction::Switch(_)))
            {
                waiting.push(position);
            }
        }
        if waiting.len() < 2 {
            return waiting.first();
        }
        if let [first, second] = *waiting.as_mut_slice() {
            let first_action = queue[first.flat()].expect("a waiting position has an action");
            let second_action = queue[second.flat()].expect("a waiting position has an action");
            let key = |engine: &Self, position, action| {
                (
                    matches!(action, QueuedAction::Switch(_)),
                    engine.priority(position, action),
                )
            };
            return Some(
                match key(self, first, first_action).cmp(&key(self, second, second_action)) {
                    Ordering::Greater => first,
                    Ordering::Less => second,
                    Ordering::Equal => {
                        let mut pair = [first, second];
                        self.sort_by_speed(&mut pair);
                        pair[0]
                    }
                },
            );
        }
        let key = |engine: &Self, position: Position| {
            let action = queue[position.flat()].expect("a waiting position has an action");
            (
                matches!(action, QueuedAction::Switch(_)),
                engine.priority(position, action),
            )
        };
        // Speed is only computed when switching and priority do not decide.
        let best = waiting
            .iter()
            .map(|position| key(self, position))
            .max()
            .expect("there are waiting positions");
        let mut tied: Positions = waiting
            .as_mut_slice()
            .iter()
            .copied()
            .filter(|&position| key(self, position) == best)
            .collect();
        self.sort_by_speed(tied.as_mut_slice());
        tied.first()
    }

    /// Showdown's `speedSort` over positions: fastest first, with each group of equal speed
    /// shuffled, which draws `k - 1` numbers for a group of `k`.
    ///
    /// Deliberate difference: Showdown also re-sorts, and so re-rolls, speed ties at every
    /// `Update` and `runSwitch`. pkmn only sorts where the order changes an outcome, so
    /// speed-tied battles draw fewer random numbers than Showdown's from the first tie on.
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

    /// The positions in `candidates`, fastest first.
    fn speed_order(&mut self, candidates: Positions) -> Positions {
        let mut order = candidates;
        self.sort_by_speed(order.as_mut_slice());
        order
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
    /// on its side, along with its queued action and its place in `switch_order`.
    fn swap_position(
        &mut self,
        side: Position,
        to: u8,
        queue: &mut [Option<QueuedAction>; MAX_POSITIONS],
    ) {
        let to = Position::new(side.side, to);
        self.emit(Event::Swap { pokemon: side, to });
        let (from, into) = (usize::from(side.index), usize::from(to.index));
        let team = &mut self.state.sides[side.side.index()];
        team.active.swap(from, into);
        team.switch_flag.swap(from, into);
        team.switch_order.swap(from, into);
        queue.swap(side.flat(), to.flat());
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
            let mut queue = [None; MAX_POSITIONS];
            self.swap_position(first, 1, &mut queue);
            self.swap_position(second, 1, &mut queue);
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
        self.emit_switch(side);
    }

    /// Showdown's `dragIn`: a forced switch picks a random replacement from
    /// `possibleSwitches`, cancels the dragged-out creature's action, and runs the switch-in.
    fn drag_in(&mut self, side: Position, queue: &mut [Option<QueuedAction>; MAX_POSITIONS]) {
        let candidates: Vec<usize> = self.state.side(side.side).drag_candidates().collect();
        let Ok(count) = u32::try_from(candidates.len()) else {
            return;
        };
        if count == 0 || self.active(side).is_fainted() {
            return;
        }
        let index = usize::try_from(self.state.prng.below(count)).unwrap_or(0);
        self.switch_in(side, candidates[index]);
        queue[side.flat()] = None;
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
        true
    }

    /// Runs `onStart` abilities and items for creatures that just switched in, fastest first.
    fn run_switch_in(&mut self, entering: Positions) {
        let order = self.speed_order(entering);
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

    /// Showdown's `Update` event: items that react to HP or status get a chance to trigger,
    /// fastest creature first.
    fn update(&mut self) {
        let mut reacting = Positions::new();
        for side in self.positions() {
            if self.mask(side).intersects(HandlerMask::UPDATE) && !self.active(side).is_fainted() {
                reacting.push(side);
            }
        }
        if reacting.len() == 0 {
            return;
        }
        if reacting.len() > 1 {
            reacting = self.speed_order(reacting);
        }
        for side in reacting {
            if self.active(side).is_fainted() {
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
        if self.state.outcome.is_some() {
            return true;
        }
        let mut last_fainted = None;
        for side in self.faint_queue.take() {
            self.emit(Event::Faint { pokemon: side });
            // Showdown's `faintMessages`: stat stages, volatiles, and Terastallization go.
            let fainted = self.active_mut(side);
            fainted.boosts = Boosts::default();
            fainted.volatiles = Volatiles::default();
            fainted.terastallized = false;
            last_fainted = Some(side.side);
        }
        if last_fainted.is_none() {
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
