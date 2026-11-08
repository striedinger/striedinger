//! Requests and choices, following Pokémon Showdown: a side gets a move request, a
//! `forceSwitch` request, or `wait`, and answers with `move N`, `switch N`, or `pass`.

use std::fmt;

use serde::{Deserialize, Serialize};

use super::state::{BattleState, Pokemon, Position, SideId};
use crate::dex::{Dex, MoveId, MoveTarget};

/// What a side is being asked to decide.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "request", rename_all = "camelCase")]
pub enum Request {
    /// Choose a move or a switch for the coming turn. When nothing else can be selected, the
    /// only move is Struggle, in slot 0.
    Move {
        /// The active creature's moves.
        moves: Vec<MoveOption>,
        /// Team slots that can be switched in.
        switches: Vec<usize>,
        /// Whether the active creature may Terastallize with its move.
        can_terastallize: bool,
    },
    /// The active creature fainted; choose a replacement.
    ForceSwitch {
        /// Team slots that can be switched in.
        switches: Vec<usize>,
    },
    /// The other side is choosing a replacement; answer [`Choice::Pass`].
    Wait,
}

/// A move the active creature can choose.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveOption {
    /// The index to pass to [`Choice::Move`].
    pub slot: usize,
    /// The move.
    pub move_id: MoveId,
    /// Remaining PP.
    pub pp: u8,
    /// Max PP.
    pub max_pp: u8,
    /// Whether it cannot be chosen.
    pub disabled: bool,
    /// What it targets; in doubles, a `normal` move needs a target location.
    pub target: MoveTarget,
}

/// One position's decision, in Showdown's choice syntax.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Choice {
    /// `move N`: use the move in this slot (slot 0 is Struggle when that is the only move).
    Move(usize),
    /// `move N terastallize`: Terastallize at the start of the turn, then use the move.
    Terastallize(usize),
    /// `move N T`: in doubles, use the move on target location T (see
    /// [`Position::target_location`]).
    MoveAt(usize, i8),
    /// `move N T terastallize`.
    TerastallizeAt(usize, i8),
    /// `switch N`: switch to the creature in this team slot.
    Switch(usize),
    /// `pass`: do nothing, while another position switches or with no creature here.
    Pass,
}

impl Choice {
    /// The move slot, for a move choice.
    #[must_use]
    pub fn move_slot(self) -> Option<usize> {
        match self {
            Self::Move(slot)
            | Self::Terastallize(slot)
            | Self::MoveAt(slot, _)
            | Self::TerastallizeAt(slot, _) => Some(slot),
            Self::Switch(_) | Self::Pass => None,
        }
    }

    /// The target location, for a move choice that names one.
    #[must_use]
    pub fn target(self) -> Option<i8> {
        match self {
            Self::MoveAt(_, target) | Self::TerastallizeAt(_, target) => Some(target),
            _ => None,
        }
    }

    /// Whether the choice Terastallizes.
    #[must_use]
    pub fn terastallizes(self) -> bool {
        matches!(self, Self::Terastallize(_) | Self::TerastallizeAt(..))
    }
}

/// Why a side's choice was rejected.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ChoiceError {
    /// The position the choice was for.
    pub position: Position,
    /// The rejected choice.
    pub choice: Choice,
    /// Why it was rejected.
    pub reason: ChoiceErrorReason,
}

/// Why a choice was rejected.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChoiceErrorReason {
    /// The battle has ended.
    BattleOver,
    /// That kind of choice is not what the request asks for.
    WrongKind,
    /// The move slot is empty, out of PP, or disabled.
    DisabledMove,
    /// The team slot is empty, fainted, or already active.
    InvalidSwitch,
    /// The side has already Terastallized this battle, or another position is doing so.
    CannotTerastallize,
    /// The move needs a target location and none or an invalid one was given, or it was given
    /// one it does not take.
    InvalidTarget,
}

impl fmt::Display for ChoiceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let reason = match self.reason {
            ChoiceErrorReason::BattleOver => "the battle has ended",
            ChoiceErrorReason::WrongKind => "that kind of choice is not requested",
            ChoiceErrorReason::DisabledMove => "that move cannot be selected",
            ChoiceErrorReason::InvalidSwitch => "that team member cannot switch in",
            ChoiceErrorReason::CannotTerastallize => "this side has already Terastallized",
            ChoiceErrorReason::InvalidTarget => "that is not a valid target for the move",
        };
        write!(
            formatter,
            "{} chose {:?}, but {reason}",
            self.position, self.choice
        )
    }
}

impl std::error::Error for ChoiceError {}

pub(crate) fn request(dex: &Dex, state: &BattleState, position: Position) -> Option<Request> {
    if state.outcome.is_some() {
        return None;
    }
    let team = state.side(position.side);
    if state.awaiting_switch() {
        return Some(if state.must_switch(position) {
            Request::ForceSwitch {
                switches: team.switches_at(position.index).collect(),
            }
        } else {
            Request::Wait
        });
    }
    let Some(active) = team
        .active_at(position.index)
        .filter(|active| !active.is_fainted())
    else {
        return Some(Request::Wait);
    };
    let selectable = active.selectable_moves(dex);
    let forced_elsewhere = active
        .forced_move()
        .filter(|&forced| active.moves().all(|(_, move_slot)| move_slot.id != forced));
    let lone = |move_id: MoveId| MoveOption {
        slot: 0,
        move_id,
        pp: 0,
        max_pp: 0,
        disabled: false,
        target: dex.move_data(move_id).target,
    };
    let moves = if let Some(forced) = forced_elsewhere {
        vec![lone(forced)]
    } else if selectable == 0 {
        vec![lone(dex.struggle())]
    } else {
        active
            .moves()
            .map(|(slot, move_slot)| MoveOption {
                slot,
                move_id: move_slot.id,
                pp: move_slot.pp,
                max_pp: move_slot.max_pp,
                disabled: selectable & (1 << slot) == 0,
                target: dex.move_data(move_slot.id).target,
            })
            .collect()
    };
    Some(Request::Move {
        moves,
        switches: team.switches_at(position.index).collect(),
        can_terastallize: can_terastallize(state, position),
    })
}

/// The move a choice of `slot` uses: a forced move, Struggle, or the slot's own.
fn chosen_move(dex: &Dex, active: &Pokemon, slot: usize) -> MoveId {
    active
        .forced_move()
        .or_else(|| {
            active
                .can_select_move(dex, slot)
                .then(|| active.move_slots[slot].map(|move_slot| move_slot.id))
                .flatten()
        })
        .unwrap_or_else(|| dex.struggle())
}

/// Whether a doubles choice of this move must name a target: a `normal` move the creature
/// chose, rather than one it is forced to use.
fn needs_target(dex: &Dex, state: &BattleState, active: &Pokemon, slot: usize) -> bool {
    state.game_type.active_per_side() > 1
        && active.forced_move().is_none()
        && dex
            .move_data(chosen_move(dex, active, slot))
            .target
            .needs_choice()
}

/// The target locations a `normal` move may name from `position`: any other position in
/// battle, ally or foe, as in Showdown's doubles, where every position is adjacent.
fn target_locations(state: &BattleState, position: Position) -> impl Iterator<Item = i8> + use<> {
    state
        .positions()
        .into_iter()
        .filter(move |&other| other != position)
        .map(move |other| position.target_location(other))
}

/// Every legal choice for a position, generated lazily without allocating: each selectable
/// move (at each target location, in doubles, when it needs one), then with Terastallization,
/// then the switches, then a pass.
#[derive(Clone, Debug)]
pub struct Choices {
    /// Move slots still to offer, as a bitset.
    moves: u8,
    /// Of those, the slots that need a target location.
    targeted: u8,
    /// The target locations a targeted move can name, and how many there are.
    targets: [i8; 3],
    target_count: u8,
    tera: bool,
    /// Where the current move slot has got to: target index, then Terastallization.
    target_index: u8,
    terastallizing: bool,
    /// Team slots still to offer as switches, as a bitset.
    switches: u8,
    pass: bool,
}

impl Iterator for Choices {
    type Item = Choice;

    fn next(&mut self) -> Option<Choice> {
        if self.moves != 0 {
            let slot = self.moves.trailing_zeros() as usize;
            let targeted = self.targeted & (1 << slot) != 0;
            let target = targeted.then(|| self.targets[usize::from(self.target_index)]);
            let choice = match (target, self.terastallizing) {
                (None, false) => Choice::Move(slot),
                (None, true) => Choice::Terastallize(slot),
                (Some(target), false) => Choice::MoveAt(slot, target),
                (Some(target), true) => Choice::TerastallizeAt(slot, target),
            };
            // Advance: Terastallization after each plain choice, then the next target, then
            // the next slot.
            if self.tera && !self.terastallizing {
                self.terastallizing = true;
            } else {
                self.terastallizing = false;
                self.target_index += 1;
                if !targeted || self.target_index >= self.target_count {
                    self.target_index = 0;
                    self.moves &= self.moves - 1;
                }
            }
            return Some(choice);
        }
        if self.switches != 0 {
            let slot = self.switches.trailing_zeros() as usize;
            self.switches &= self.switches - 1;
            return Some(Choice::Switch(slot));
        }
        if self.pass {
            self.pass = false;
            return Some(Choice::Pass);
        }
        None
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        let per_target = 1 + usize::from(self.tera);
        let targeted = self.moves & self.targeted;
        let untargeted = self.moves & !self.targeted;
        let remaining = untargeted.count_ones() as usize * per_target
            + targeted.count_ones() as usize * per_target * usize::from(self.target_count)
            + self.switches.count_ones() as usize
            + usize::from(self.pass);
        // The current slot may be partly used up, so this is only an upper bound.
        (0, Some(remaining))
    }
}

/// Every legal choice for a position, without allocating.
pub(crate) fn choices(dex: &Dex, state: &BattleState, position: Position) -> Choices {
    let mut choices = Choices {
        moves: 0,
        targeted: 0,
        targets: [0; 3],
        target_count: 0,
        tera: false,
        target_index: 0,
        terastallizing: false,
        switches: 0,
        pass: false,
    };
    let team = state.side(position.side);
    let over = state.outcome.is_some();
    let switching = !over && state.awaiting_switch();
    let must_switch = switching && state.must_switch(position);
    let active = team
        .active_at(position.index)
        .filter(|active| !active.is_fainted());
    let choosing_moves = !over && !switching && active.is_some();
    if let Some(active) = active.filter(|_| choosing_moves) {
        choices.moves = active.choosable_moves(dex);
        choices.tera = can_terastallize(state, position);
        if state.game_type.active_per_side() > 1 {
            for slot in
                (0..super::state::MAX_MOVES).filter(|&slot| choices.moves & (1 << slot) != 0)
            {
                if needs_target(dex, state, active, slot) {
                    choices.targeted |= 1 << slot;
                }
            }
            for (entry, location) in choices
                .targets
                .iter_mut()
                .zip(target_locations(state, position))
            {
                *entry = location;
                choices.target_count += 1;
            }
            if choices.target_count == 0 {
                choices.moves &= !choices.targeted;
            }
        }
    }
    if choosing_moves || must_switch {
        for slot in team.switches_at(position.index) {
            if let Ok(slot) = u8::try_from(slot)
                && slot < 8
            {
                choices.switches |= 1 << slot;
            }
        }
    }
    choices.pass = (switching && !must_switch)
        || (!switching && !choosing_moves && !over)
        || (must_switch && fewer_replacements_than_switches(state, position));
    choices
}

/// Whether the side has more positions that must switch than creatures to send in, so some
/// may pass (Showdown's `forcedPassesLeft`).
fn fewer_replacements_than_switches(state: &BattleState, position: Position) -> bool {
    let team = state.side(position.side);
    let switching = state
        .positions()
        .into_iter()
        .filter(|other| other.side == position.side && state.must_switch(*other))
        .count();
    let bench = (0..team.team.len())
        .filter(|&slot| team.can_switch_to(slot))
        .count();
    bench < switching
}

pub(crate) fn validate(
    dex: &Dex,
    state: &BattleState,
    position: Position,
    choice: Choice,
) -> Result<(), ChoiceError> {
    let reject = |reason| {
        Err(ChoiceError {
            position,
            choice,
            reason,
        })
    };
    if state.outcome.is_some() {
        return reject(ChoiceErrorReason::BattleOver);
    }
    let team = state.side(position.side);
    if state.awaiting_switch() {
        return match (state.must_switch(position), choice) {
            (true, Choice::Switch(slot))
                if team.switches_at(position.index).any(|open| open == slot) =>
            {
                Ok(())
            }
            (true, Choice::Switch(_)) => reject(ChoiceErrorReason::InvalidSwitch),
            (true, Choice::Pass) if fewer_replacements_than_switches(state, position) => Ok(()),
            (false, Choice::Pass) => Ok(()),
            _ => reject(ChoiceErrorReason::WrongKind),
        };
    }
    let Some(active) = team
        .active_at(position.index)
        .filter(|active| !active.is_fainted())
    else {
        return match choice {
            Choice::Pass => Ok(()),
            _ => reject(ChoiceErrorReason::WrongKind),
        };
    };
    if let Some(slot) = choice.move_slot() {
        if choice.terastallizes() && !can_terastallize(state, position) {
            return reject(ChoiceErrorReason::CannotTerastallize);
        }
        if !(active.can_select_move(dex, slot) || slot == 0 && active.must_struggle(dex)) {
            return reject(ChoiceErrorReason::DisabledMove);
        }
        let valid_target = match choice.target() {
            None => !needs_target(dex, state, active, slot),
            // Singles accepts a target and ignores it, as Showdown does.
            Some(_) if state.game_type.active_per_side() == 1 => true,
            Some(target) => {
                needs_target(dex, state, active, slot)
                    && target_locations(state, position).any(|open| open == target)
            }
        };
        return if valid_target {
            Ok(())
        } else {
            reject(ChoiceErrorReason::InvalidTarget)
        };
    }
    match choice {
        // `switches_at` also refuses a creature trapped by a rampage or a charged move.
        Choice::Switch(slot) if team.switches_at(position.index).any(|open| open == slot) => Ok(()),
        Choice::Switch(_) => reject(ChoiceErrorReason::InvalidSwitch),
        _ => reject(ChoiceErrorReason::WrongKind),
    }
}

/// Checks choices that conflict across a side's positions: two switches to the same team
/// member, two Terastallizations, or more passes than a shortage of replacements allows.
pub(crate) fn validate_side(
    state: &BattleState,
    side: SideId,
    choices: &[(Position, Choice)],
) -> Result<(), ChoiceError> {
    let mine = || choices.iter().filter(|(position, _)| position.side == side);
    let mut seen = Vec::new();
    for &(position, choice) in mine() {
        let reject = |reason| {
            Err(ChoiceError {
                position,
                choice,
                reason,
            })
        };
        if let Choice::Switch(slot) = choice {
            if seen.contains(&slot) {
                return reject(ChoiceErrorReason::InvalidSwitch);
            }
            seen.push(slot);
        }
    }
    if let Some(&(position, choice)) = mine().filter(|(_, choice)| choice.terastallizes()).nth(1) {
        return Err(ChoiceError {
            position,
            choice,
            reason: ChoiceErrorReason::CannotTerastallize,
        });
    }
    if state.awaiting_switch() {
        let team = state.side(side);
        let bench = (0..team.team.len())
            .filter(|&slot| team.can_switch_to(slot))
            .count();
        let switches = mine()
            .filter(|(_, choice)| matches!(choice, Choice::Switch(_)))
            .count();
        // A position that must switch may pass only once every creature left is going in.
        let forced_pass = mine()
            .find(|&&(position, choice)| choice == Choice::Pass && state.must_switch(position));
        if let Some(&(position, choice)) = forced_pass
            && switches < bench
        {
            return Err(ChoiceError {
                position,
                choice,
                reason: ChoiceErrorReason::WrongKind,
            });
        }
    }
    Ok(())
}

/// Whether the creature at a position may Terastallize: once per side per battle.
fn can_terastallize(state: &BattleState, position: Position) -> bool {
    state.side(position.side).can_terastallize && !state.active(position).terastallized
}
