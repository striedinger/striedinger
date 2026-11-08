//! What happened in battle, named after Pokémon Showdown's protocol messages (`switch`,
//! `move`, `-damage`, `-boost`, `-weather`, `faint`, `win`, ...).

use serde::{Deserialize, Serialize};

use super::state::{Position, SideId, TeraType};
use crate::dex::{
    AbilityId, ItemId, MoveId, SideConditionId, SpeciesId, Status, TerrainId, VolatileStatus,
    WeatherId,
};
use crate::stats::BoostStat;

/// Something that happened in battle, in order. Frontends render these; the engine never
/// produces text. A side names the creature currently active on it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "event",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Event {
    /// `turn`: a new turn begins and both sides choose.
    Turn {
        /// The turn number.
        turn: u32,
    },
    /// `switch`: a creature entered the field.
    Switch {
        /// The creature, by position.
        pokemon: Position,
        /// Its team slot.
        slot: usize,
        /// Its species.
        species: SpeciesId,
        /// Its current HP.
        hp: u16,
        /// Its max HP.
        max_hp: u16,
    },
    /// `move`: a creature used a move.
    Move {
        /// The creature, by position.
        pokemon: Position,
        /// The move.
        move_id: MoveId,
    },
    /// `cant`: a creature could not move.
    Cant {
        /// The creature, by position.
        pokemon: Position,
        /// Why.
        reason: CantReason,
    },
    /// `-miss`: a move missed.
    Miss {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-fail`: a move did nothing.
    Fail {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-immune`: the target was unaffected.
    Immune {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-crit`: a critical hit.
    Crit {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-supereffective`.
    SuperEffective {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-resisted`: not very effective.
    Resisted {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `-damage`: a creature lost HP.
    Damage {
        /// The creature, by position.
        pokemon: Position,
        /// HP lost.
        amount: u16,
        /// HP left.
        hp: u16,
        /// What caused it (Showdown's `[from]`).
        from: DamageSource,
    },
    /// `-heal`: a creature restored HP.
    Heal {
        /// The creature, by position.
        pokemon: Position,
        /// HP restored.
        amount: u16,
        /// HP after healing.
        hp: u16,
        /// What caused it (Showdown's `[from]`).
        from: HealSource,
    },
    /// `-hitcount`: a multi-hit move finished.
    HitCount {
        /// Hits that landed.
        hits: u8,
    },
    /// `-status`: a creature received a status.
    Status {
        /// The creature, by position.
        pokemon: Position,
        /// The status.
        status: Status,
    },
    /// `-curestatus`: a creature's status ended.
    CureStatus {
        /// The creature, by position.
        pokemon: Position,
        /// The status.
        status: Status,
    },
    /// `-start`: a volatile status began.
    Start {
        /// The creature, by position.
        pokemon: Position,
        /// The volatile status.
        volatile: VolatileStatus,
    },
    /// `-activate`: a volatile status took effect, such as confusion on a move attempt.
    Activate {
        /// The creature, by position.
        pokemon: Position,
        /// The volatile status.
        volatile: VolatileStatus,
    },
    /// `-end`: a volatile status ended.
    End {
        /// The creature, by position.
        pokemon: Position,
        /// The volatile status.
        volatile: VolatileStatus,
    },
    /// `-boost` / `-unboost`: a stat stage changed.
    Boost {
        /// The creature, by position.
        pokemon: Position,
        /// The stat.
        stat: BoostStat,
        /// The change that applied after clamping; negative for `-unboost`.
        stages: i8,
    },
    /// `-weather`: the weather changed; `None` means it ended.
    Weather {
        /// The new weather.
        weather: Option<WeatherId>,
    },
    /// `-prepare`: a `charge` move spent this turn charging.
    Prepare {
        /// The creature, by position.
        pokemon: Position,
        /// The move.
        move_id: MoveId,
    },
    /// `-fieldstart` / `-fieldend`: the terrain changed; `None` means it ended.
    Terrain {
        /// The new terrain.
        terrain: Option<TerrainId>,
    },
    /// `-terastallize`: the active creature Terastallized.
    Terastallize {
        /// The creature, by position.
        pokemon: Position,
        /// What it became.
        tera_type: TeraType,
    },
    /// `-activate`: a side condition like Wide Guard blocked a move.
    SideActivate {
        /// The side it is on.
        side: SideId,
        /// The condition.
        condition: SideConditionId,
    },
    /// `-sidestart`: a side condition began, or gained a layer.
    SideStart {
        /// The side it is on.
        side: SideId,
        /// The condition.
        condition: SideConditionId,
    },
    /// `-sideend`: a side condition ended.
    SideEnd {
        /// The side it was on.
        side: SideId,
        /// The condition.
        condition: SideConditionId,
    },
    /// `-ability`: an ability took effect; the events it caused follow.
    Ability {
        /// The creature, by position.
        pokemon: Position,
        /// The ability.
        ability: AbilityId,
    },
    /// `-item`: an item took effect; the events it caused follow.
    Item {
        /// The creature, by position.
        pokemon: Position,
        /// The item.
        item: ItemId,
    },
    /// `-enditem`: a held item was used up.
    EndItem {
        /// The creature, by position.
        pokemon: Position,
        /// The item.
        item: ItemId,
    },
    /// `faint`: a creature fainted.
    Faint {
        /// The creature, by position.
        pokemon: Position,
    },
    /// `win`: the battle ended with a winner.
    Win {
        /// The winning side.
        side: SideId,
    },
    /// `tie`: the battle ended without a winner.
    Tie,
}

/// An ability or item, as named in Showdown's `[from] ability: ...` and `[from] item: ...`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Effect {
    /// An ability.
    Ability(AbilityId),
    /// A held item.
    Item(ItemId),
}

/// Why a creature could not move, with Showdown's `cant` reasons.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CantReason {
    /// `slp`: asleep.
    Sleep,
    /// `frz`: frozen.
    Freeze,
    /// `par`: fully paralyzed.
    Paralysis,
    /// `flinch`.
    Flinch,
}

/// What caused HP loss.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DamageSource {
    /// A move hit it.
    Move,
    /// `[from] Recoil`: recoil from its own move.
    Recoil,
    /// `[from] confusion`: it hurt itself in confusion.
    Confusion,
    /// `[from] brn` / `psn` / `tox`.
    Status(Status),
    /// `[from] <weather>`.
    Weather(WeatherId),
    /// An entry hazard on switching in.
    Hazard(SideConditionId),
    /// The HP paid to put up a substitute.
    Substitute,
    /// `[from] ability: ...` or `[from] item: ...`.
    Effect(Effect),
}

/// What caused HP recovery.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HealSource {
    /// `[from] drain`.
    Drain,
    /// A healing move.
    Move,
    /// `[from] <terrain>`, for grounded creatures.
    Terrain(TerrainId),
    /// `[from] ability: ...` or `[from] item: ...`.
    Effect(Effect),
}
