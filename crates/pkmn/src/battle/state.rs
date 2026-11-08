//! Battle state, shaped like Pokémon Showdown's: sides with teams and an active slot, each
//! creature's `status` with its `statusState`, its `volatiles`, and the field's weather.

use serde::{Deserialize, Serialize};

use crate::dex::{
    AbilityId, Dex, HandlerMask, ItemId, MoveCategory, MoveId, SideConditionId, SpeciesId, Status,
    TerrainId, TypeId, WeatherId,
};
use crate::prng::Prng;
use crate::stats::{Boosts, StatTable};

/// The most creatures a side has in battle at once, in triples.
pub const MAX_ACTIVE: usize = 3;
/// The most positions on the field: both sides' in triples.
pub const MAX_POSITIONS: usize = 2 * MAX_ACTIVE;
/// The most sides in a battle: four in free-for-all.
pub const MAX_SIDES: usize = 4;

/// One of the players: two, or four in free-for-all.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SideId {
    /// The first player.
    P1,
    /// The second player.
    P2,
    /// The third player, in free-for-all.
    P3,
    /// The fourth player, in free-for-all.
    P4,
}

impl SideId {
    /// The two sides of a two-player battle, in order.
    pub const BOTH: [Self; 2] = [Self::P1, Self::P2];
    /// All four sides, in order.
    pub const ALL: [Self; MAX_SIDES] = [Self::P1, Self::P2, Self::P3, Self::P4];

    /// Returns `0` for [`SideId::P1`], `1` for [`SideId::P2`], and so on.
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Showdown's ID for the side: `p1` to `p4`.
    #[must_use]
    pub const fn id(self) -> &'static str {
        match self {
            Self::P1 => "p1",
            Self::P2 => "p2",
            Self::P3 => "p3",
            Self::P4 => "p4",
        }
    }

    /// Showdown's `side.foe`: the other side of a two-player battle. In free-for-all, where
    /// every other side is a foe, it pairs `p1` with `p2` and `p3` with `p4`.
    #[must_use]
    pub fn foe(self) -> Self {
        match self {
            Self::P1 => Self::P2,
            Self::P2 => Self::P1,
            Self::P3 => Self::P4,
            Self::P4 => Self::P3,
        }
    }

    /// Showdown's half of the field: `p1` and `p3` on one, `p2` and `p4` on the other.
    const fn half(self) -> usize {
        self.index() % 2
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
    /// A rampage like Outrage's (Showdown's `lockedmove`).
    pub locked_move: Option<LockedMove>,
    /// A `charge` move that charged last turn and must now be used (Showdown's
    /// `twoturnmove`).
    pub charging: Option<MoveId>,
    /// End-of-turn checks left on Showdown's `twoturnmove`, which outlasts the charge by one
    /// turn: 0 when it is absent.
    #[serde(default)]
    pub two_turn_move: u8,
    /// The target location of the last move it used, which a rampage keeps aiming at
    /// (Showdown's `lastMoveTargetLoc`).
    #[serde(default)]
    pub last_target: Option<i8>,
    /// The target location a charging move hits next turn.
    #[serde(default)]
    pub charge_target: Option<i8>,
    /// Whether Follow Me draws the foes' moves this turn.
    #[serde(default)]
    pub follow_me: bool,
    /// Helping Hands received this turn, each ×1.5 base power.
    #[serde(default)]
    pub helping_hand: u8,
}

/// Showdown's `lockedmove` volatile, with its two counters.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockedMove {
    /// The move it is locked into, which a calling move may have picked from outside its
    /// moveset.
    pub move_id: MoveId,
    /// Turns of rampage left, rolled as 2 or 3 at the start; confusion follows if it runs out.
    pub true_duration: u8,
    /// End-of-turn checks before the lock lapses.
    pub duration: u8,
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
    /// Shift from an edge to the center, in triples.
    Shift,
    /// Use the move in this slot, or Struggle.
    Move {
        /// The move slot; `None` for Struggle.
        slot: Option<usize>,
        /// The chosen target location in doubles (see [`Position::target_location`]).
        target: Option<i8>,
        /// The move it uses, fixed when it is chosen (Showdown's `action.move`): a creature
        /// that faints loses its rampage, but its queued move does not change.
        #[serde(rename = "move")]
        move_id: MoveId,
    },
}

/// Singles, doubles, triples or free-for-all (Showdown's `gameType`).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GameType {
    /// One active creature per side.
    #[default]
    Singles,
    /// Two active creatures per side.
    Doubles,
    /// Three active creatures per side.
    Triples,
    /// Four sides of one active creature each, every one a foe of the others.
    #[serde(rename = "freeforall")]
    FreeForAll,
}

impl GameType {
    /// How many creatures each side has in battle at once.
    #[must_use]
    pub const fn active_per_side(self) -> usize {
        match self {
            Self::Singles | Self::FreeForAll => 1,
            Self::Doubles => 2,
            Self::Triples => 3,
        }
    }

    /// How many creatures each half of the field holds (Showdown's `activePerHalf`): in
    /// free-for-all, two sides of one share each half, so it plays like doubles.
    #[must_use]
    pub const fn active_per_half(self) -> usize {
        match self {
            Self::FreeForAll => 2,
            other => other.active_per_side(),
        }
    }

    /// How many sides the battle has.
    #[must_use]
    pub const fn side_count(self) -> usize {
        match self {
            Self::FreeForAll => MAX_SIDES,
            _ => 2,
        }
    }
}

/// A place on the field: a side and an index among its active creatures, like Showdown's
/// `p1a`, `p1b` and `p1c`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Position {
    /// The side.
    pub side: SideId,
    /// 0 for the first active creature (`a`), 1 for the second (`b`), 2 for the third (`c`).
    pub index: u8,
}

impl Position {
    /// Every position in a triples battle, in Showdown's order. Free-for-all's are
    /// [`SideId::ALL`]'s first positions.
    pub const ALL: [Self; MAX_POSITIONS] = [
        Self::new(SideId::P1, 0),
        Self::new(SideId::P1, 1),
        Self::new(SideId::P1, 2),
        Self::new(SideId::P2, 0),
        Self::new(SideId::P2, 1),
        Self::new(SideId::P2, 2),
    ];

    /// A position.
    #[must_use]
    pub const fn new(side: SideId, index: u8) -> Self {
        Self { side, index }
    }

    /// An index below [`MAX_POSITIONS`] for arrays over all positions. Free-for-all's
    /// `p3` and `p4` take the places of `p1b` and `p2b`, on their halves of the field.
    #[must_use]
    pub const fn flat(self) -> usize {
        self.side.half() * MAX_ACTIVE + self.side.index() / 2 + self.index as usize
    }

    /// The target location that names `target` from this position, as in Showdown's
    /// `move N T` choices and `getLocOf`: 1, 2 and 3 for the other half's positions, -1, -2
    /// and -3 for the user's half. In free-for-all, `p1` and `p3` share a half, as do `p2`
    /// and `p4`.
    #[must_use]
    pub fn target_location(self, target: Self) -> i8 {
        let place =
            i8::try_from(target.side.index() / 2 + usize::from(target.index)).unwrap_or(0) + 1;
        if target.side.half() == self.side.half() {
            -place
        } else {
            place
        }
    }

    /// Whether two positions are adjacent when each side has `per_side` of them, as
    /// Showdown's `validTargetLoc` places them: neighbours on the same side, and foes across or
    /// diagonally across. In singles and doubles every other position is adjacent.
    #[must_use]
    pub const fn is_adjacent(self, other: Self, per_side: usize) -> bool {
        let (mine, theirs) = (self.index as usize, other.index as usize);
        if self.side.index() == other.side.index() {
            mine.abs_diff(theirs) == 1
        } else {
            (mine + theirs + 1).abs_diff(per_side) <= 1
        }
    }

    /// The position a target location names from this position (Showdown's `getAtLoc`).
    #[must_use]
    pub fn from_target_location(self, location: i8, game_type: GameType) -> Option<Self> {
        let place = location.unsigned_abs().checked_sub(1)?;
        let half = if location > 0 {
            1 - self.side.half()
        } else {
            self.side.half()
        };
        if game_type == GameType::FreeForAll {
            let side = *SideId::ALL.get(half + 2 * usize::from(place))?;
            Some(Self::new(side, 0))
        } else {
            Some(Self::new(SideId::BOTH[half], place))
        }
    }
}

/// A short list of positions, so ordering them does not allocate.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Positions {
    items: [Position; MAX_POSITIONS],
    len: usize,
}

impl Positions {
    /// An empty list.
    #[must_use]
    pub fn new() -> Self {
        Self {
            items: [Position::from(SideId::P1); MAX_POSITIONS],
            len: 0,
        }
    }

    /// Adds a position; a full list ignores it.
    pub fn push(&mut self, position: Position) {
        if let Some(item) = self.items.get_mut(self.len) {
            *item = position;
            self.len += 1;
        }
    }

    pub(crate) fn as_mut_slice(&mut self) -> &mut [Position] {
        &mut self.items[..self.len]
    }

    /// The positions, as a slice.
    #[must_use]
    pub fn as_slice(&self) -> &[Position] {
        &self.items[..self.len]
    }

    /// The positions, in order.
    pub fn iter(&self) -> impl Iterator<Item = Position> + use<> {
        let Self { items, len } = *self;
        items.into_iter().take(len)
    }

    /// How many positions there are.
    #[must_use]
    pub fn len(&self) -> usize {
        self.len
    }

    /// The first position, if any.
    #[must_use]
    pub fn first(&self) -> Option<Position> {
        self.iter().next()
    }
}

impl FromIterator<Position> for Positions {
    fn from_iter<I: IntoIterator<Item = Position>>(positions: I) -> Self {
        let mut list = Self::new();
        for position in positions {
            list.push(position);
        }
        list
    }
}

impl Default for Positions {
    fn default() -> Self {
        Self::new()
    }
}

impl IntoIterator for Positions {
    type Item = Position;
    type IntoIter = std::iter::Take<std::array::IntoIter<Position, MAX_POSITIONS>>;

    fn into_iter(self) -> Self::IntoIter {
        self.items.into_iter().take(self.len)
    }
}

impl From<SideId> for Position {
    /// A side's first position, the only one in singles.
    fn from(side: SideId) -> Self {
        Self::new(side, 0)
    }
}

impl std::fmt::Display for Position {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let letter = char::from(b'a' + self.index);
        write!(formatter, "{}{letter}", self.side.id())
    }
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
    /// What it becomes when it Terastallizes.
    pub tera_type: TeraType,
    /// Whether it has Terastallized.
    pub terastallized: bool,
    /// After a Stellar Terastallization, the types that have had their one boost, a bit per
    /// type ID (Showdown's `stellarBoostedTypes`). Kept through switching.
    #[serde(default)]
    pub stellar_boosted_types: u32,
    /// [`Pokemon::handler_mask`], kept up to date by the engine so a turn need not look it up.
    #[serde(skip)]
    pub(crate) mask: HandlerMask,
}

/// The bit for a type in [`Pokemon::stellar_boosted_types`]; a dex has at most 32 types.
fn stellar_bit(type_id: TypeId) -> u32 {
    1_u32.checked_shl(u32::from(type_id.0)).unwrap_or(0)
}

/// What a creature becomes when it Terastallizes.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TeraType {
    /// It becomes this type alone.
    Type(TypeId),
    /// Stellar: it keeps its own types, and the first move of each type it uses is boosted.
    Stellar,
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

    /// The creature's current types: only its Tera type once it has Terastallized, unless
    /// that is Stellar, which keeps its own.
    pub fn types(&self) -> impl Iterator<Item = TypeId> + use<> {
        let (primary, secondary) = match (self.terastallized, self.tera_type) {
            (true, TeraType::Type(tera_type)) => (tera_type, None),
            _ => (self.primary_type, self.secondary_type),
        };
        std::iter::once(primary).chain(secondary)
    }

    /// Whether a Stellar Terastallization has already boosted a move of this type.
    #[must_use]
    pub fn is_stellar_boosted(&self, type_id: TypeId) -> bool {
        self.stellar_boosted_types & stellar_bit(type_id) != 0
    }

    /// Records that a Stellar Terastallization has boosted a move of this type.
    pub fn mark_stellar_boosted(&mut self, type_id: TypeId) {
        self.stellar_boosted_types |= stellar_bit(type_id);
    }

    /// Whether the creature currently has `type_id`.
    #[must_use]
    pub fn has_type(&self, type_id: TypeId) -> bool {
        self.types().any(|current| current == type_id)
    }

    /// Whether its species has `type_id`, ignoring Terastallization (Showdown's
    /// `getTypes(false, true)`), which still grants STAB.
    #[must_use]
    pub fn has_original_type(&self, type_id: TypeId) -> bool {
        self.primary_type == type_id || self.secondary_type == Some(type_id)
    }

    /// The move slot it must use: a rampage or a charged move.
    #[must_use]
    pub fn locked_slot(&self) -> Option<usize> {
        let forced = self.forced_move()?;
        // A move from outside the moveset, called by another move, is chosen as slot 0, as
        // Showdown's lone `move 1` is.
        Some(
            self.moves()
                .find(|(_, move_slot)| move_slot.id == forced)
                .map_or(0, |(slot, _)| slot),
        )
    }

    /// The move it must use this turn: a rampage, or a move it charged last turn.
    #[must_use]
    pub fn forced_move(&self) -> Option<MoveId> {
        self.volatiles
            .locked_move
            .map(|locked| locked.move_id)
            .or(self.volatiles.charging)
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
        Self::mask_of(dex, self.ability, self.item)
    }

    pub(crate) fn with_mask(mut self, dex: &Dex) -> Self {
        self.refresh_mask(dex);
        self
    }

    /// Recomputes the cached handler mask after the ability or item changed.
    pub(crate) fn refresh_mask(&mut self, dex: &Dex) {
        self.mask = Self::mask_of(dex, self.ability, self.item);
    }

    fn mask_of(dex: &Dex, ability: Option<AbilityId>, item: Option<ItemId>) -> HandlerMask {
        let ability = ability.map_or(HandlerMask::default(), |id| dex.ability(id).mask);
        let item = item.map_or(HandlerMask::default(), |id| dex.item(id).mask);
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
        match self.locked_slot() {
            Some(locked) => locked == slot,
            None => self.slot_selectable(dex, slot, self.disables_status_moves(dex)),
        }
    }

    /// The move slots that can be selected, as a bitset. A rampage or charged move allows only
    /// its own slot, whatever its PP.
    #[must_use]
    pub fn selectable_moves(&self, dex: &Dex) -> u8 {
        if let Some(slot) = self.locked_slot() {
            return 1 << slot;
        }
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
    /// The team slot of each position's creature; `None` past the side's positions. A position
    /// whose creature fainted with no replacement keeps it.
    pub active: [Option<usize>; MAX_ACTIVE],
    /// Conditions on this side, such as entry hazards and screens.
    #[serde(default)]
    pub conditions: Vec<SideConditionState>,
    /// Whether each position's creature must switch out mid-turn after a move like U-turn
    /// (Showdown's `switchFlag`).
    #[serde(default)]
    pub switch_flag: [bool; MAX_ACTIVE],
    /// Whether a team member may still Terastallize this battle.
    #[serde(default = "can_terastallize")]
    pub can_terastallize: bool,
    /// Team slots in Showdown's `side.pokemon` order, which puts the active creatures first, by
    /// position, and swaps places on every switch. Forced switches pick from it at random.
    #[serde(default)]
    pub switch_order: Vec<usize>,
}

fn can_terastallize() -> bool {
    true
}

impl Side {
    /// The creature at a position, or `None` past this side's positions.
    #[must_use]
    #[inline]
    pub fn active_at(&self, index: u8) -> Option<&Pokemon> {
        self.active
            .get(usize::from(index))
            .copied()
            .flatten()
            .map(|slot| &self.team[slot])
    }

    /// The first position's creature, the only one in singles.
    #[must_use]
    pub fn active(&self) -> &Pokemon {
        &self.team[self.active[0].unwrap_or(0)]
    }

    pub(crate) fn active_mut_at(&mut self, index: u8) -> &mut Pokemon {
        let slot = self.active[usize::from(index)].unwrap_or(0);
        &mut self.team[slot]
    }

    /// Whether `slot` holds a healthy creature that is not already active.
    #[must_use]
    pub fn can_switch_to(&self, slot: usize) -> bool {
        !self.active.contains(&Some(slot))
            && self
                .team
                .get(slot)
                .is_some_and(|pokemon| !pokemon.is_fainted())
    }

    /// Team slots the first position can switch to; see [`Side::switches_at`].
    pub fn switches(&self) -> impl Iterator<Item = usize> {
        self.switches_at(0)
    }

    /// Team slots a position can switch to. A creature locked into a rampage or a charged
    /// move cannot switch out.
    pub fn switches_at(&self, index: u8) -> impl Iterator<Item = usize> {
        let trapped = self
            .active_at(index)
            .is_some_and(|pokemon| !pokemon.is_fainted() && pokemon.locked_slot().is_some());
        (0..self.team.len()).filter(move |&slot| !trapped && self.can_switch_to(slot))
    }

    /// Team slots a forced switch can drag in, in Showdown's `possibleSwitches` order.
    pub fn drag_candidates(&self) -> impl Iterator<Item = usize> {
        self.switch_order
            .iter()
            .skip(self.active.iter().flatten().count())
            .copied()
            .filter(|&slot| self.can_switch_to(slot))
    }

    /// Whether every team member has fainted.
    #[must_use]
    pub fn is_defeated(&self) -> bool {
        self.team.iter().all(Pokemon::is_fainted)
    }

    /// Whether a position's creature fainted and a replacement can switch in.
    #[must_use]
    #[inline]
    pub fn must_replace(&self, index: u8) -> bool {
        self.active_at(index).is_some_and(Pokemon::is_fainted)
            && self.switches_at(index).next().is_some()
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
    /// The current terrain, if any.
    #[serde(default)]
    pub terrain: Option<TerrainState>,
}

/// The active terrain and its remaining duration, like Showdown's `terrainState`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerrainState {
    /// The terrain.
    pub id: TerrainId,
    /// End-of-turn checks left before it ends.
    pub duration: u8,
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
    /// Every side, indexed by [`SideId::index`]: two, or four in free-for-all.
    pub sides: Vec<Side>,
    /// Battle-wide conditions.
    pub field: Field,
    /// The result, once the battle has ended.
    pub outcome: Option<Outcome>,
    /// The last move used, by either side, for Copycat (Showdown's `battle.lastMove`).
    #[serde(default)]
    pub last_move: Option<MoveId>,
    /// The rest of a turn paused for a mid-turn switch, by [`Position::flat`].
    #[serde(default)]
    pub queue: Option<[Option<QueuedAction>; MAX_POSITIONS]>,
    /// Singles, doubles or triples.
    #[serde(default)]
    pub game_type: GameType,
}

impl BattleState {
    /// The battle's sides, in order.
    pub fn side_ids(&self) -> impl Iterator<Item = SideId> + use<> {
        SideId::ALL.into_iter().take(self.sides.len())
    }

    /// Returns a side.
    #[must_use]
    pub fn side(&self, side: SideId) -> &Side {
        &self.sides[side.index()]
    }

    /// Returns the creature at a position; a side converts to its first position.
    ///
    /// # Panics
    ///
    /// Panics if the position is past this battle's positions.
    #[must_use]
    pub fn active(&self, position: impl Into<Position>) -> &Pokemon {
        let position = position.into();
        self.side(position.side)
            .active_at(position.index)
            .expect("the position exists in this battle")
    }

    /// Every position in battle, in Showdown's order: each side's filled positions.
    #[inline]
    #[must_use]
    pub fn positions(&self) -> Positions {
        let mut positions = Positions::new();
        for (side, team) in SideId::ALL.into_iter().zip(&self.sides) {
            for (index, slot) in (0_u8..).zip(team.active) {
                if slot.is_some() {
                    positions.push(Position::new(side, index));
                }
            }
        }
        positions
    }

    /// Whether a position must switch now, which is when Showdown sends it a `forceSwitch`
    /// request. A mid-turn switch flag takes precedence: replacements for fainted creatures
    /// wait for the end of the turn.
    #[must_use]
    pub fn must_switch(&self, position: impl Into<Position>) -> bool {
        let position = position.into();
        let side = self.side(position.side);
        if self
            .sides
            .iter()
            .any(|team| team.switch_flag.contains(&true))
        {
            side.switch_flag
                .get(usize::from(position.index))
                .copied()
                .unwrap_or(false)
        } else {
            side.must_replace(position.index)
        }
    }

    /// Whether any position must switch before the battle can go on.
    #[inline]
    #[must_use]
    pub fn awaiting_switch(&self) -> bool {
        for side in &self.sides {
            if side.switch_flag.contains(&true) {
                return true;
            }
            for (index, slot) in (0_u8..).zip(side.active) {
                if slot.is_some_and(|slot| side.team[slot].is_fainted())
                    && side.switches_at(index).next().is_some()
                {
                    return true;
                }
            }
        }
        false
    }
}
