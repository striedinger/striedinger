//! Showdown's action queue (`BattleQueue`): a turn's actions sorted by order, priority and
//! speed, each speed tie shuffled, and sorted again after each action that leaves a move
//! next.

use std::cmp::Ordering;

use super::Engine;
use crate::battle::request::Choice;
use crate::battle::state::{MAX_POSITIONS, PausedAction, Position, QueuedAction, SideId};
use crate::dex::MoveId;

/// What a queue entry does.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Step {
    /// Showdown's `beforeTurn` action.
    BeforeTurn,
    /// A creature's switch, shift or move.
    Act(QueuedAction),
    /// Terastallizing, after switches and before moves.
    Terastallize,
    /// The end-of-turn effects.
    Residual,
}

impl Step {
    /// Showdown's action `order`: lower runs first.
    const fn order(self) -> u16 {
        match self {
            Self::BeforeTurn => 4,
            Self::Act(QueuedAction::Switch(_)) => 103,
            Self::Terastallize => 106,
            Self::Act(QueuedAction::Shift | QueuedAction::Move { .. }) => 200,
            Self::Residual => 300,
        }
    }

    const fn is_move(self) -> bool {
        matches!(self, Self::Act(QueuedAction::Move { .. }))
    }
}

/// A queued action with the priority and speed it sorts by (Showdown's `getActionSpeed`).
#[derive(Clone, Copy, Debug)]
pub(super) struct Entry {
    pub(super) position: Position,
    pub(super) step: Step,
    priority: i8,
    speed: u32,
}

impl Entry {
    const EMPTY: Self = Self {
        position: Position::new(SideId::P1, 0),
        step: Step::Residual,
        priority: 0,
        speed: 0,
    };

    /// Showdown's `comparePriority`: by order, then priority, then speed.
    fn compare(&self, other: &Self) -> Ordering {
        self.step
            .order()
            .cmp(&other.step.order())
            .then(other.priority.cmp(&self.priority))
            .then(other.speed.cmp(&self.speed))
    }
}

/// Room for a move and a Terastallization per position, `beforeTurn`, and `residual`.
const CAPACITY: usize = 2 * MAX_POSITIONS + 2;

/// The actions left this turn, in the order they run: `entries[start..end]`, with room
/// before them for `beforeTurn`.
#[derive(Clone, Copy, Debug)]
pub(super) struct Queue {
    entries: [Entry; CAPACITY],
    start: usize,
    end: usize,
}

impl Queue {
    fn new() -> Self {
        Self {
            entries: [Entry::EMPTY; CAPACITY],
            start: 1,
            end: 1,
        }
    }

    fn push(&mut self, entry: Entry) {
        if let Some(free) = self.entries.get_mut(self.end) {
            *free = entry;
            self.end += 1;
        }
    }

    fn push_front(&mut self, entry: Entry) {
        if self.start > 0 {
            self.start -= 1;
            self.entries[self.start] = entry;
        }
    }

    fn pop_front(&mut self) -> Option<Entry> {
        let first = *self.entries[self.start..self.end].first()?;
        self.start += 1;
        Some(first)
    }

    fn as_mut_slice(&mut self) -> &mut [Entry] {
        &mut self.entries[self.start..self.end]
    }

    fn iter(&self) -> impl Iterator<Item = &Entry> {
        self.entries[self.start..self.end].iter()
    }

    /// Whether a creature still has a switch, shift or move queued (Showdown's `willAct`).
    pub(super) fn will_act(&self) -> bool {
        self.iter().any(|entry| matches!(entry.step, Step::Act(_)))
    }

    /// The move each position still has queued (Showdown's `willMove`).
    pub(super) fn moves(&self) -> [Option<MoveId>; MAX_POSITIONS] {
        let mut moves = [None; MAX_POSITIONS];
        for entry in self.iter() {
            if let Step::Act(QueuedAction::Move { move_id, .. }) = entry.step {
                moves[entry.position.flat()] = Some(move_id);
            }
        }
        moves
    }

    /// Drops a position's queued actions, as Showdown's `cancelAction` does for a creature
    /// that is dragged out.
    pub(super) fn cancel(&mut self, position: Position) {
        let mut kept = self.start;
        for index in self.start..self.end {
            let entry = self.entries[index];
            if entry.position != position
                || !matches!(entry.step, Step::Act(_) | Step::Terastallize)
            {
                self.entries[kept] = entry;
                kept += 1;
            }
        }
        self.end = kept;
    }

    /// Two creatures traded places: their queued actions go with them.
    pub(super) fn swap(&mut self, first: Position, second: Position) {
        for entry in self.as_mut_slice() {
            if entry.position == first {
                entry.position = second;
            } else if entry.position == second {
                entry.position = first;
            }
        }
    }

    /// The creatures' actions still to run, kept in the state while the turn waits for a
    /// mid-turn switch.
    pub(super) fn paused(&self) -> [Option<PausedAction>; MAX_POSITIONS] {
        let mut paused = [None; MAX_POSITIONS];
        let actions = self.iter().filter_map(|entry| match entry.step {
            Step::Act(action) => Some(PausedAction {
                position: entry.position,
                action,
            }),
            _ => None,
        });
        for (slot, action) in paused.iter_mut().zip(actions) {
            *slot = Some(action);
        }
        paused
    }
}

impl Engine<'_> {
    /// Showdown's `getActionSpeed` for a queued step. Queue sorts follow an `updateSpeed`,
    /// so a standing creature's cached speed is its action speed; a fainted creature's is
    /// worked out afresh.
    fn queue_entry(&self, position: Position, step: Step) -> Entry {
        let speed = || {
            let pokemon = self.active(position);
            if pokemon.is_fainted() {
                self.action_speed(position)
            } else {
                pokemon.speed
            }
        };
        let (priority, speed) = match step {
            Step::BeforeTurn | Step::Residual => (0, 1),
            Step::Act(QueuedAction::Move { move_id, .. }) => (
                self.move_priority(position, self.dex.move_data(move_id)).0,
                speed(),
            ),
            Step::Act(_) | Step::Terastallize => (0, speed()),
        };
        Entry {
            position,
            step,
            priority,
            speed,
        }
    }

    /// Showdown's `commitChoices` for a turn: each position's actions, in choice order, with
    /// a Terastallization ahead of its move and each move's target resolved (which can draw
    /// in doubles), sorted; then `beforeTurn` goes first and `residual` last.
    pub(super) fn turn_queue(&mut self, choices: [Choice; MAX_POSITIONS]) -> Queue {
        let mut queue = Queue::new();
        let multi = self.state.game_type.active_per_half() > 1;
        for position in self.positions() {
            let choice = choices[position.flat()];
            let Some(mut action) = self.action_for(position, choice) else {
                continue;
            };
            if choice.terastallizes() {
                queue.push(self.queue_entry(position, Step::Terastallize));
            }
            if multi {
                action = self.resolve_target(position, action);
            }
            queue.push(self.queue_entry(position, Step::Act(action)));
        }
        self.speed_sort(queue.as_mut_slice(), Entry::compare);
        let first = self.queue_entry(Position::new(SideId::P1, 0), Step::BeforeTurn);
        queue.push_front(first);
        let last = self.queue_entry(Position::new(SideId::P1, 0), Step::Residual);
        queue.push(last);
        queue
    }

    /// The rest of a turn that waited for a mid-turn switch, then `residual`.
    pub(super) fn resumed_queue(&self, paused: [Option<PausedAction>; MAX_POSITIONS]) -> Queue {
        let mut queue = Queue::new();
        for paused in paused.into_iter().flatten() {
            queue.push(self.queue_entry(paused.position, Step::Act(paused.action)));
        }
        queue.push(self.queue_entry(Position::new(SideId::P1, 0), Step::Residual));
        queue
    }

    /// Showdown's `resolveAction` for a move: one with no target location gets a random one,
    /// and `getActionSpeed` then resolves the target, either of which can draw.
    fn resolve_target(&mut self, position: Position, action: QueuedAction) -> QueuedAction {
        let QueuedAction::Move {
            slot,
            target,
            move_id,
        } = action
        else {
            return action;
        };
        let move_data = self.dex.move_data(move_id);
        let target = target.or_else(|| {
            let chosen = self.get_random_target(position, move_data);
            Some(position.target_location(chosen))
        });
        self.get_target(position, move_data, target);
        QueuedAction::Move {
            slot,
            target,
            move_id,
        }
    }

    /// Showdown's re-sort before a move (Generation 8 onward): every cached speed is
    /// updated, every queued action's priority and speed are read again in queue order
    /// (resolving each queued move's target again, which can draw in doubles), and the queue
    /// is sorted.
    fn resort_queue(&mut self, queue: &mut Queue) {
        self.update_speeds();
        let multi = self.state.game_type.active_per_half() > 1;
        for index in queue.start..queue.end {
            let entry = queue.entries[index];
            if matches!(entry.step, Step::BeforeTurn | Step::Residual) {
                continue;
            }
            if multi
                && let Step::Act(QueuedAction::Move {
                    target, move_id, ..
                }) = entry.step
            {
                self.get_target(entry.position, self.dex.move_data(move_id), target);
            }
            queue.entries[index] = self.queue_entry(entry.position, entry.step);
        }
        self.speed_sort(queue.as_mut_slice(), Entry::compare);
    }

    /// Runs the queue until the turn ends, the battle ends, or a creature must switch
    /// mid-turn, in which case the rest waits in the state. `ran` says whether the action
    /// just before ran: Showdown re-sorts only after one that did (a fainted creature's
    /// skipped move does not), and only when a move is next.
    pub(super) fn run_queue(&mut self, mut queue: Queue, mut ran: bool) {
        loop {
            if ran
                && queue
                    .iter()
                    .next()
                    .is_some_and(|entry| entry.step.is_move())
            {
                self.resort_queue(&mut queue);
            }
            let Some(entry) = queue.pop_front() else {
                return;
            };
            ran = match entry.step {
                // An `eachEvent('BeforeTurn')`, then the action's `Update`.
                Step::BeforeTurn => {
                    self.each_event();
                    self.update();
                    true
                }
                Step::Terastallize => {
                    self.terastallize(entry.position);
                    true
                }
                Step::Residual => {
                    self.residual();
                    return;
                }
                Step::Act(action) => match self.act(entry.position, action, &mut queue) {
                    Some(ran) => ran,
                    None => return,
                },
            };
        }
    }
}
