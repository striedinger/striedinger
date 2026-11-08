use std::fmt;

use serde::{Deserialize, Serialize};

use super::state::{BattleState, SideId};
use crate::dex::{Dex, MoveId};

/// What a side is being asked to decide.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "request", rename_all = "snake_case")]
pub enum Request {
    /// Choose a move, Struggle, or a switch for the coming turn.
    Turn {
        /// The active creature's moves.
        moves: Vec<MoveOption>,
        /// Team slots that can be switched in.
        switches: Vec<usize>,
        /// Whether every move is out of PP, so [`Choice::Struggle`] replaces move choices.
        must_struggle: bool,
    },
    /// The active creature fainted; choose a replacement.
    Replace {
        /// Team slots that can be switched in.
        switches: Vec<usize>,
    },
    /// The other side is choosing a replacement; submit [`Choice::Pass`].
    Wait,
}

/// A move the active creature can choose.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoveOption {
    /// The move slot to pass to [`Choice::Move`].
    pub slot: usize,
    /// The move.
    pub move_id: MoveId,
    /// Remaining PP.
    pub pp: u8,
    /// Max PP.
    pub max_pp: u8,
    /// Whether the move cannot be chosen.
    pub disabled: bool,
}

/// A side's decision.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Choice {
    /// Use the move in this slot.
    Move(usize),
    /// Use Struggle because every move is out of PP.
    Struggle,
    /// Switch to the creature in this team slot.
    Switch(usize),
    /// Do nothing while the other side chooses a replacement.
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
    /// The choice is not allowed by the current request.
    WrongKind,
    /// The move slot is empty, out of PP, or locked out by a choice item or trait.
    UnavailableMove,
    /// Every move is out of PP, so Struggle must be chosen.
    MustStruggle,
    /// The team slot is empty, fainted, or already active.
    UnavailableSwitch,
}

impl fmt::Display for ChoiceError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let reason = match self.reason {
            ChoiceErrorReason::BattleOver => "the battle has ended",
            ChoiceErrorReason::WrongKind => "that kind of choice is not requested",
            ChoiceErrorReason::UnavailableMove => "that move cannot be selected right now",
            ChoiceErrorReason::MustStruggle => "every move is out of PP, so it must struggle",
            ChoiceErrorReason::UnavailableSwitch => "that team member cannot switch in",
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
    if state.awaiting_replacements() {
        return Some(if team.needs_replacement() {
            Request::Replace {
                switches: team.switch_options().collect(),
            }
        } else {
            Request::Wait
        });
    }
    let active = team.active();
    let must_struggle = active.must_struggle(dex);
    Some(Request::Turn {
        moves: active
            .move_slots()
            .map(|(slot, move_slot)| MoveOption {
                slot,
                move_id: move_slot.id,
                pp: move_slot.pp,
                max_pp: move_slot.max_pp,
                disabled: !active.can_select_move(dex, slot),
            })
            .collect(),
        switches: team.switch_options().collect(),
        must_struggle,
    })
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
    if state.awaiting_replacements() {
        return match (team.needs_replacement(), choice) {
            (true, Choice::Switch(slot)) if team.can_switch_to(slot) => Ok(()),
            (true, Choice::Switch(_)) => reject(ChoiceErrorReason::UnavailableSwitch),
            (false, Choice::Pass) => Ok(()),
            _ => reject(ChoiceErrorReason::WrongKind),
        };
    }
    let active = team.active();
    match choice {
        Choice::Move(_) if active.must_struggle(dex) => reject(ChoiceErrorReason::MustStruggle),
        Choice::Move(slot) => {
            if active.can_select_move(dex, slot) {
                Ok(())
            } else {
                reject(ChoiceErrorReason::UnavailableMove)
            }
        }
        Choice::Struggle if active.must_struggle(dex) => Ok(()),
        Choice::Switch(slot) if team.can_switch_to(slot) => Ok(()),
        Choice::Switch(_) => reject(ChoiceErrorReason::UnavailableSwitch),
        Choice::Struggle | Choice::Pass => reject(ChoiceErrorReason::WrongKind),
    }
}
