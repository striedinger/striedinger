//! Requests and choices, following Pokémon Showdown: a side gets a move request, a
//! `forceSwitch` request, or `wait`, and answers with `move N`, `switch N`, or `pass`.

use std::fmt;

use serde::{Deserialize, Serialize};

use super::state::{BattleState, SideId};
use crate::dex::{Dex, MoveId};

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
}

/// A side's decision.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Choice {
    /// `move N`: use the move in this slot (slot 0 is Struggle when that is the only move).
    Move(usize),
    /// `move N terastallize`: Terastallize at the start of the turn, then use the move.
    Terastallize(usize),
    /// `switch N`: switch to the creature in this team slot.
    Switch(usize),
    /// `pass`: do nothing while the other side switches in a replacement.
    Pass,
}

/// Why a side's choice was rejected.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ChoiceError {
    /// The side that made the choice.
    pub side: SideId,
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
    /// The side has already Terastallized this battle.
    CannotTerastallize,
}

impl fmt::Display for ChoiceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let reason = match self.reason {
            ChoiceErrorReason::BattleOver => "the battle has ended",
            ChoiceErrorReason::WrongKind => "that kind of choice is not requested",
            ChoiceErrorReason::DisabledMove => "that move cannot be selected",
            ChoiceErrorReason::InvalidSwitch => "that team member cannot switch in",
            ChoiceErrorReason::CannotTerastallize => "this side has already Terastallized",
        };
        write!(
            formatter,
            "{:?} chose {:?}, but {reason}",
            self.side, self.choice
        )
    }
}

impl std::error::Error for ChoiceError {}

pub(crate) fn request(dex: &Dex, state: &BattleState, side: SideId) -> Option<Request> {
    if state.outcome.is_some() {
        return None;
    }
    let team = state.side(side);
    if state.awaiting_switch() {
        return Some(if state.must_switch(side) {
            Request::ForceSwitch {
                switches: team.switches().collect(),
            }
        } else {
            Request::Wait
        });
    }
    let active = team.active();
    let selectable = active.selectable_moves(dex);
    let moves = if selectable == 0 {
        vec![MoveOption {
            slot: 0,
            move_id: dex.struggle(),
            pp: 0,
            max_pp: 0,
            disabled: false,
        }]
    } else {
        active
            .moves()
            .map(|(slot, move_slot)| MoveOption {
                slot,
                move_id: move_slot.id,
                pp: move_slot.pp,
                max_pp: move_slot.max_pp,
                disabled: selectable & (1 << slot) == 0,
            })
            .collect()
    };
    Some(Request::Move {
        moves,
        switches: team.switches().collect(),
        can_terastallize: can_terastallize(state, side),
    })
}

/// Every legal choice for `side`, without allocating.
pub(crate) fn choices<'a>(
    dex: &'a Dex,
    state: &'a BattleState,
    side: SideId,
) -> impl Iterator<Item = Choice> + 'a {
    let team = state.side(side);
    let over = state.outcome.is_some();
    let switching = !over && state.awaiting_switch();
    let must_switch = switching && state.must_switch(side);
    let choosing_moves = !over && !switching;
    let selectable = if choosing_moves {
        team.active().choosable_moves(dex)
    } else {
        0
    };
    let tera = choosing_moves && can_terastallize(state, side);
    let moves = (0..super::state::MAX_MOVES)
        .filter(move |&slot| selectable & (1 << slot) != 0)
        .flat_map(move |slot| {
            std::iter::once(Choice::Move(slot)).chain(tera.then_some(Choice::Terastallize(slot)))
        });
    let switches = team
        .switches()
        .filter(move |_| choosing_moves || must_switch)
        .map(Choice::Switch);
    let pass = (switching && !must_switch).then_some(Choice::Pass);
    moves.chain(switches).chain(pass)
}

pub(crate) fn validate(
    dex: &Dex,
    state: &BattleState,
    side: SideId,
    choice: Choice,
) -> Result<(), ChoiceError> {
    let reject = |reason| {
        Err(ChoiceError {
            side,
            choice,
            reason,
        })
    };
    if state.outcome.is_some() {
        return reject(ChoiceErrorReason::BattleOver);
    }
    let team = state.side(side);
    if state.awaiting_switch() {
        return match (state.must_switch(side), choice) {
            (true, Choice::Switch(slot)) if team.can_switch_to(slot) => Ok(()),
            (true, Choice::Switch(_)) => reject(ChoiceErrorReason::InvalidSwitch),
            (false, Choice::Pass) => Ok(()),
            _ => reject(ChoiceErrorReason::WrongKind),
        };
    }
    let active = team.active();
    match choice {
        Choice::Terastallize(_) if !can_terastallize(state, side) => {
            reject(ChoiceErrorReason::CannotTerastallize)
        }
        Choice::Move(slot) | Choice::Terastallize(slot) if active.can_select_move(dex, slot) => {
            Ok(())
        }
        Choice::Move(0) | Choice::Terastallize(0) if active.must_struggle(dex) => Ok(()),
        Choice::Move(_) | Choice::Terastallize(_) => reject(ChoiceErrorReason::DisabledMove),
        // `switches` also refuses a creature trapped by a rampage or a charged move.
        Choice::Switch(slot) if team.switches().any(|open| open == slot) => Ok(()),
        Choice::Switch(_) => reject(ChoiceErrorReason::InvalidSwitch),
        Choice::Pass => reject(ChoiceErrorReason::WrongKind),
    }
}

/// Whether the side's active creature may Terastallize: once per side per battle.
fn can_terastallize(state: &BattleState, side: SideId) -> bool {
    state.side(side).can_terastallize && !state.active(side).terastallized
}
