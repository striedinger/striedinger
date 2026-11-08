//! Battle state, shaped like Pokémon Showdown's: sides with teams and an active slot, each
//! creature's `status` with its `statusState`, its `volatiles`, and the field's weather.

use serde::{Deserialize, Serialize};

use crate::dex::{
    AbilityId, Dex, HandlerMask, ItemId, MoveCategory, MoveId, SideConditionId, SpeciesId, Status,
    TypeId, WeatherId,
};
use crate::prng::Prng;
use crate::stats::{Boosts, StatTable};

/// One of the two players.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SideId {
    /// The first player.
    P1,
    /// The second player.
    P2,
}

impl SideId {
    /// Both sides, in order.
    pub const BOTH: [Self; 2] = [Self::P1, Self::P2];

    /// Returns `0` for [`SideId::P1`] and `1` for [`SideId::P2`].
    #[must_use]
    pub fn index(self) -> usize {
        self as usize
    }

    /// Returns the other side, the "foe".
    #[must_use]
    pub fn foe(self) -> Self {
        match self {
            Self::P1 => Self::P2,
            Self::P2 => Self::P1,
        }
    }
}

/// Counters a status keeps, like Showdown's `statusState`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusState {
    /// Sleep: move attempts left, counting the one that wakes it.
    pub time: u8,
    /// Bad poison: sixteenths of max HP dealt by the last residual; reset on switching in.
    pub stage: u8,
}

/// Volatile statuses, cleared when the creature switches out.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Volatiles {
    /// Confusion's remaining move attempts, counting the one that snaps it out.
    pub confusion: Option<u8>,
    /// Whether it flinched this turn.
    pub flinch: bool,
    /// The move slot a choice item has locked it into (Showdown's `choicelock`).
    pub choice_lock: Option<u8>,
    /// Whether Protect is up for the rest of the turn.
    pub protect: bool,
    /// The consecutive-Protect counter (Showdown's `stall`).
    pub stall: Option<Stall>,
    /// The substitute's remaining HP.
    pub substitute: Option<u16>,
}

/// Showdown's `stall` volatile: a Protect-like move made in the last two turns succeeds only
/// with chance `1 / counter`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stall {
    /// 3 after the first success, tripling with each consecutive one up to 729.
    pub counter: u16,
    /// End-of-turn checks left before it expires.
    pub duration: u8,
}

/// A condition on one side of the field and its state, like Showdown's `sideConditions`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SideConditionState {
    /// The condition.
    pub id: SideConditionId,
    /// Layers set, for hazards that stack.
    pub layers: u8,
    /// End-of-turn checks left, for conditions that expire.
    pub duration: Option<u8>,
}

/// An action still to run this turn, kept while the turn waits for a mid-turn switch.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QueuedAction {
    /// Switch to the creature in this team slot.
    Switch(usize),
    /// Use the move in this slot, or Struggle.
    Move(Option<usize>),
}

/// A known move and its remaining PP, like Showdown's `moveSlots`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveSlot {
    /// The move.
    pub id: MoveId,
    /// Remaining PP.
    pub pp: u8,
    /// PP after three PP Ups.
    pub max_pp: u8,
}

/// The most moves a creature can know.
pub const MAX_MOVES: usize = 4;

/// A creature in battle.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pokemon {
    /// The species.
    pub species: SpeciesId,
    /// The level, from 1 to 100.
    pub level: u8,
    /// The primary type.
    pub primary_type: TypeId,
    /// The secondary type, if any.
    pub secondary_type: Option<TypeId>,
    /// Permanent stats (Showdown's `storedStats`); `stats.hp` is the max HP.
    pub stats: StatTable,
    /// Current HP.
    pub hp: u16,
    /// Known moves in slot order.
    pub move_slots: [Option<MoveSlot>; MAX_MOVES],
    /// The ability, if any.
    pub ability: Option<AbilityId>,
    /// The held item, if any.
    pub item: Option<ItemId>,
    /// The non-volatile status, if any.
    pub status: Option<Status>,
    /// The status's counters.
    pub status_state: StatusState,
    /// Stat stages.
    pub boosts: Boosts,
    /// Volatile statuses.
    pub volatiles: Volatiles,
    /// Turns started while active; zero during the turn it switched in.
    pub active_turns: u16,
}

impl Pokemon {
    /// Max HP.
    #[must_use]
    pub fn max_hp(&self) -> u16 {
        self.stats.hp
    }

    /// Whether the creature has fainted.
    #[must_use]
    pub fn is_fainted(&self) -> bool {
        self.hp == 0
    }

    /// The creature's types.
    pub fn types(&self) -> impl Iterator<Item = TypeId> + use<> {
        std::iter::once(self.primary_type).chain(self.secondary_type)
    }

    /// Whether the creature has `type_id`.
    #[must_use]
    pub fn has_type(&self, type_id: TypeId) -> bool {
        self.primary_type == type_id || self.secondary_type == Some(type_id)
    }

    /// Known moves with their slot index.
    pub fn moves(&self) -> impl Iterator<Item = (usize, &MoveSlot)> {
        self.move_slots
            .iter()
            .enumerate()
            .filter_map(|(slot, move_slot)| move_slot.as_ref().map(|move_slot| (slot, move_slot)))
    }

    /// The kinds of handler its ability and item have.
    #[must_use]
    pub fn handler_mask(&self, dex: &Dex) -> HandlerMask {
        let ability = self
            .ability
            .map_or(HandlerMask::default(), |id| dex.ability(id).mask);
        let item = self
            .item
            .map_or(HandlerMask::default(), |id| dex.item(id).mask);
        ability.union(item)
    }

    fn disables_status_moves(&self, dex: &Dex) -> bool {
        self.handler_mask(dex)
            .intersects(HandlerMask::DISABLE_STATUS_MOVES)
    }

    fn slot_selectable(&self, dex: &Dex, slot: usize, disables_status: bool) -> bool {
        let Some(move_slot) = self.move_slots.get(slot).copied().flatten() else {
            return false;
        };
        let locked_out = self
            .volatiles
            .choice_lock
            .is_some_and(|locked| usize::from(locked) != slot);
        move_slot.pp > 0
            && !locked_out
            && !(disables_status && dex.move_data(move_slot.id).category == MoveCategory::Status)
    }

    /// Whether the move in `slot` can be selected: it has PP, and neither a choice lock nor
    /// `disableStatusMoves` rules it out.
    #[must_use]
    pub fn can_select_move(&self, dex: &Dex, slot: usize) -> bool {
        self.slot_selectable(dex, slot, self.disables_status_moves(dex))
    }

    /// The move slots that can be selected, as a bitset.
    #[must_use]
    pub fn selectable_moves(&self, dex: &Dex) -> u8 {
        let disables_status = self.disables_status_moves(dex);
        (0..MAX_MOVES)
            .filter(|&slot| self.slot_selectable(dex, slot, disables_status))
            .fold(0, |slots, slot| slots | 1 << slot)
    }

    /// The move slots a [`Choice::Move`](super::Choice::Move) may name, as a bitset. With
    /// nothing selectable this is slot 0, which then stands for Struggle, as Showdown's lone
    /// `move 1` does.
    #[must_use]
    pub fn choosable_moves(&self, dex: &Dex) -> u8 {
        match self.selectable_moves(dex) {
            0 => 1,
            slots => slots,
        }
    }

    /// Whether no move can be selected, so its only move is Struggle.
    #[must_use]
    pub fn must_struggle(&self, dex: &Dex) -> bool {
        self.selectable_moves(dex) == 0
    }
}

/// A player's team.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Side {
    /// Every team member in team order.
    pub team: Vec<Pokemon>,
    /// The index of the active creature in `team`.
    pub active: usize,
    /// Conditions on this side, such as entry hazards and screens.
    #[serde(default)]
    pub conditions: Vec<SideConditionState>,
    /// Whether the active creature must switch out mid-turn after a move like U-turn
    /// (Showdown's `switchFlag`).
    #[serde(default)]
    pub switch_flag: bool,
}

impl Side {
    /// The active creature.
    #[must_use]
    pub fn active(&self) -> &Pokemon {
        &self.team[self.active]
    }

    pub(crate) fn active_mut(&mut self) -> &mut Pokemon {
        &mut self.team[self.active]
    }

    /// Whether `slot` holds a healthy creature that is not already active.
    #[must_use]
    pub fn can_switch_to(&self, slot: usize) -> bool {
        slot != self.active
            && self
                .team
                .get(slot)
                .is_some_and(|pokemon| !pokemon.is_fainted())
    }

    /// Team slots that can be switched in.
    pub fn switches(&self) -> impl Iterator<Item = usize> {
        (0..self.team.len()).filter(|&slot| self.can_switch_to(slot))
    }

    /// Whether every team member has fainted.
    #[must_use]
    pub fn is_defeated(&self) -> bool {
        self.team.iter().all(Pokemon::is_fainted)
    }

    /// Whether the active creature fainted and a replacement must switch in.
    #[must_use]
    pub fn must_replace(&self) -> bool {
        self.active().is_fainted() && self.switches().next().is_some()
    }

    /// The state of a condition on this side, if it is present.
    #[must_use]
    pub fn condition(&self, id: SideConditionId) -> Option<&SideConditionState> {
        self.conditions.iter().find(|condition| condition.id == id)
    }
}

/// The active weather and its remaining duration, like Showdown's `weatherState`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherState {
    /// The weather.
    pub id: WeatherId,
    /// End-of-turn checks left before it ends.
    pub duration: u8,
}

/// Conditions affecting the whole battle.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Field {
    /// The current weather, if any.
    pub weather: Option<WeatherState>,
}

/// How a battle ended.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Outcome {
    /// One side won.
    Win(SideId),
    /// Both sides lost their last creature at once with no tiebreak.
    Tie,
}

/// Everything needed to resume a battle, given the same [`Dex`].
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BattleState {
    /// The turn being played, starting at 1. It advances when the next turn starts, after any
    /// replacements, as in Showdown.
    pub turn: u32,
    /// The random number generator.
    pub prng: Prng,
    /// Both sides, indexed by [`SideId::index`].
    pub sides: [Side; 2],
    /// Battle-wide conditions.
    pub field: Field,
    /// The result, once the battle has ended.
    pub outcome: Option<Outcome>,
    /// The rest of a turn paused for a mid-turn switch, by side.
    #[serde(default)]
    pub queue: Option<[Option<QueuedAction>; 2]>,
}

impl BattleState {
    /// Returns a side.
    #[must_use]
    pub fn side(&self, side: SideId) -> &Side {
        &self.sides[side.index()]
    }

    /// Returns a side's active creature.
    #[must_use]
    pub fn active(&self, side: SideId) -> &Pokemon {
        self.side(side).active()
    }

    /// Whether `side` must switch now, which is when Showdown sends it a `forceSwitch`
    /// request. A mid-turn switch flag takes precedence: replacements for fainted creatures
    /// wait for the end of the turn.
    #[must_use]
    pub fn must_switch(&self, side: SideId) -> bool {
        if self.sides.iter().any(|team| team.switch_flag) {
            self.side(side).switch_flag
        } else {
            self.side(side).must_replace()
        }
    }

    /// Whether either side must switch before the battle can go on.
    #[must_use]
    pub fn awaiting_switch(&self) -> bool {
        SideId::BOTH.into_iter().any(|side| self.must_switch(side))
    }
}
