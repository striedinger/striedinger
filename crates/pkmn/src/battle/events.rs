use serde::{Deserialize, Serialize};

use super::state::{Outcome, SideId};
use crate::dex::{MoveId, SpeciesId, StatusKind, WeatherId};
use crate::stats::BoostStat;

/// Something that happened in battle, in the order it happened.
///
/// Frontends render these; the engine never produces text. Sides name the creature that is
/// currently active on that side.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum Event {
    /// A new turn begins and both sides may choose actions.
    TurnStarted {
        /// The turn number.
        turn: u32,
    },
    /// A creature entered the field.
    SwitchedIn {
        /// The side.
        side: SideId,
        /// Its team slot.
        slot: usize,
        /// Its species.
        species: SpeciesId,
        /// Its current HP.
        hp: u16,
        /// Its max HP.
        max_hp: u16,
    },
    /// A creature used a move.
    MoveUsed {
        /// The user's side.
        side: SideId,
        /// The move.
        move_id: MoveId,
    },
    /// A creature could not act.
    CantMove {
        /// The creature's side.
        side: SideId,
        /// Why it could not act.
        reason: CantMoveReason,
    },
    /// A move missed.
    Missed {
        /// The user's side.
        side: SideId,
    },
    /// A move had no effect for a reason other than type immunity.
    Failed {
        /// The user's side.
        side: SideId,
    },
    /// The target's type made it immune.
    Immune {
        /// The target's side.
        side: SideId,
    },
    /// A hit was critical.
    CriticalHit {
        /// The target's side.
        side: SideId,
    },
    /// A hit was super effective.
    SuperEffective {
        /// The target's side.
        side: SideId,
    },
    /// A hit was not very effective.
    NotVeryEffective {
        /// The target's side.
        side: SideId,
    },
    /// A creature lost HP.
    Damaged {
        /// The creature's side.
        side: SideId,
        /// HP lost.
        amount: u16,
        /// HP left.
        hp: u16,
        /// What caused it.
        cause: DamageCause,
    },
    /// A creature restored HP.
    Healed {
        /// The creature's side.
        side: SideId,
        /// HP restored.
        amount: u16,
        /// HP after healing.
        hp: u16,
        /// What caused it.
        cause: HealCause,
    },
    /// A multi-hit move finished.
    HitCount {
        /// Hits that landed.
        hits: u8,
    },
    /// A creature received a status.
    StatusInflicted {
        /// The creature's side.
        side: SideId,
        /// The status.
        status: StatusKind,
    },
    /// A creature's status ended.
    StatusCured {
        /// The creature's side.
        side: SideId,
        /// The status.
        status: StatusKind,
    },
    /// A creature became confused.
    ConfusionStarted {
        /// The creature's side.
        side: SideId,
    },
    /// A confused creature tried to move while still confused.
    ConfusionActivated {
        /// The creature's side.
        side: SideId,
    },
    /// A creature snapped out of confusion.
    ConfusionEnded {
        /// The creature's side.
        side: SideId,
    },
    /// A stat stage changed.
    StatChanged {
        /// The creature's side.
        side: SideId,
        /// The stat.
        stat: BoostStat,
        /// The change that applied after clamping.
        stages: i8,
    },
    /// A weather began.
    WeatherStarted {
        /// The weather.
        weather: WeatherId,
    },
    /// A weather ended.
    WeatherEnded {
        /// The weather.
        weather: WeatherId,
    },
    /// A creature fainted.
    Fainted {
        /// The creature's side.
        side: SideId,
    },
    /// The battle ended.
    BattleEnded {
        /// The result.
        outcome: Outcome,
    },
}

/// Why a creature could not act.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CantMoveReason {
    /// It is asleep.
    Asleep,
    /// It is frozen.
    Frozen,
    /// It is fully paralyzed.
    Paralyzed,
    /// It flinched.
    Flinched,
    /// It hurt itself in confusion.
    HurtItselfInConfusion,
}

/// What caused HP loss.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DamageCause {
    /// A move hit it.
    Move,
    /// Recoil from its own move.
    Recoil,
    /// It hit itself in confusion.
    Confusion,
    /// Burn or poison.
    Status,
    /// The weather.
    Weather,
}

/// What caused HP recovery.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealCause {
    /// It drained HP from its target.
    Drain,
    /// A healing move.
    Move,
}
