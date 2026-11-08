use serde::{Deserialize, Serialize};

use crate::dex::{
    AbilityId, Dex, ItemId, MoveCategory, MoveId, SpeciesId, StatusKind, TraitData, TraitEffect,
    TypeId, WeatherId,
};
use crate::prng::Prng;
use crate::stats::{Boosts, StatTable};

/// One of the two players.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
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

    /// Returns the other side.
    #[must_use]
    pub fn opponent(self) -> Self {
        match self {
            Self::P1 => Self::P2,
            Self::P2 => Self::P1,
        }
    }
}

/// A non-volatile status together with the counters it needs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StatusCondition {
    /// Burned.
    Burn,
    /// Paralyzed.
    Paralysis,
    /// Poisoned.
    Poison,
    /// Badly poisoned; `stage` grows each turn and resets on switching out.
    Toxic {
        /// Sixteenths of max HP dealt by the last residual.
        stage: u8,
    },
    /// Asleep until the counter reaches zero on a move attempt.
    Sleep {
        /// Move attempts left, including the one that wakes it up.
        turns_left: u8,
    },
    /// Frozen.
    Freeze,
}

impl StatusCondition {
    /// The status without its counters.
    #[must_use]
    pub fn kind(self) -> StatusKind {
        match self {
            Self::Burn => StatusKind::Burn,
            Self::Paralysis => StatusKind::Paralysis,
            Self::Poison => StatusKind::Poison,
            Self::Toxic { .. } => StatusKind::Toxic,
            Self::Sleep { .. } => StatusKind::Sleep,
            Self::Freeze => StatusKind::Freeze,
        }
    }
}

/// A known move and its remaining PP.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoveSlot {
    /// The move.
    pub id: MoveId,
    /// Remaining PP.
    pub pp: u8,
    /// PP after three PP Ups.
    pub max_pp: u8,
}

/// Conditions cleared when a creature switches out.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Volatiles {
    /// Move attempts left while confused, including the one that snaps it out; zero when not
    /// confused.
    pub confusion_turns: u8,
    /// Whether it flinched this turn.
    pub flinched: bool,
    /// The move slot a choice item has locked it into.
    pub choice_locked_slot: Option<u8>,
    /// Whether it entered battle during the current turn.
    pub entered_this_turn: bool,
}

/// The most moves a creature can know.
pub const MAX_MOVES: usize = 4;

/// A creature in battle.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pokemon {
    /// The species.
    pub species: SpeciesId,
    /// The level, from 1 to 100.
    pub level: u8,
    /// The primary type.
    pub primary_type: TypeId,
    /// The secondary type, if any.
    pub secondary_type: Option<TypeId>,
    /// Permanent stats; `stats.hp` is the max HP.
    pub stats: StatTable,
    /// Current HP.
    pub hp: u16,
    /// Known moves in slot order.
    pub moves: [Option<MoveSlot>; MAX_MOVES],
    /// The ability, if any.
    pub ability: Option<AbilityId>,
    /// The held item, if any.
    pub item: Option<ItemId>,
    /// The non-volatile status, if any.
    pub status: Option<StatusCondition>,
    /// Stat stages.
    pub boosts: Boosts,
    /// Conditions cleared on switching out.
    pub volatiles: Volatiles,
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
    pub fn move_slots(&self) -> impl Iterator<Item = (usize, &MoveSlot)> {
        self.moves
            .iter()
            .enumerate()
            .filter_map(|(slot, move_slot)| move_slot.as_ref().map(|move_slot| (slot, move_slot)))
    }

    /// The ability and item, in that order.
    pub fn traits<'a>(&self, dex: &'a Dex) -> impl Iterator<Item = &'a TraitData> + use<'a> {
        let ability = self.ability.map(|id| dex.ability(id));
        let item = self.item.map(|id| dex.item(id));
        ability.into_iter().chain(item)
    }

    /// Whether the ability or item has an effect matching `predicate`.
    pub fn has_trait_effect(&self, dex: &Dex, predicate: impl Fn(&TraitEffect) -> bool) -> bool {
        self.traits(dex)
            .any(|data| data.effects.iter().any(&predicate))
    }

    /// Whether the move in `slot` can be selected: it has PP and no choice lock or trait
    /// forbids it.
    #[must_use]
    pub fn can_select_move(&self, dex: &Dex, slot: usize) -> bool {
        let Some(move_slot) = self.moves.get(slot).copied().flatten() else {
            return false;
        };
        if move_slot.pp == 0 {
            return false;
        }
        if self
            .volatiles
            .choice_locked_slot
            .is_some_and(|locked| usize::from(locked) != slot)
        {
            return false;
        }
        let is_status = dex.move_data(move_slot.id).category == MoveCategory::Status;
        !(is_status
            && self.has_trait_effect(dex, |effect| *effect == TraitEffect::BlocksStatusMoves))
    }

    /// Whether no move can be selected, which forces Struggle.
    #[must_use]
    pub fn must_struggle(&self, dex: &Dex) -> bool {
        !self
            .move_slots()
            .any(|(slot, _)| self.can_select_move(dex, slot))
    }
}

/// A player's team.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Side {
    /// Every team member in team order.
    pub team: Vec<Pokemon>,
    /// The index of the active creature in `team`.
    pub active: usize,
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
    pub fn switch_options(&self) -> impl Iterator<Item = usize> {
        (0..self.team.len()).filter(|&slot| self.can_switch_to(slot))
    }

    /// Whether every team member has fainted.
    #[must_use]
    pub fn is_defeated(&self) -> bool {
        self.team.iter().all(Pokemon::is_fainted)
    }

    pub(crate) fn pokemon_mut(&mut self, slot: usize) -> &mut Pokemon {
        &mut self.team[slot]
    }

    /// Whether the active creature fainted and a replacement must be chosen.
    #[must_use]
    pub fn needs_replacement(&self) -> bool {
        self.active().is_fainted() && self.switch_options().next().is_some()
    }
}

/// A weather and the turns it has left.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActiveWeather {
    /// The weather.
    pub id: WeatherId,
    /// End-of-turn checks left before it ends.
    pub turns_left: u8,
}

/// Conditions affecting the whole battle.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Field {
    /// The current weather, if any.
    pub weather: Option<ActiveWeather>,
}

/// How a battle ended.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Outcome {
    /// One side won.
    Winner(SideId),
    /// Both sides were defeated at once with no tiebreak.
    Tie,
}

/// Everything needed to resume a battle, given the same [`Dex`](crate::dex::Dex).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BattleState {
    /// The turn being played, starting at 1; it advances once the next turn starts, after any
    /// replacements.
    pub turn: u32,
    /// The random number generator.
    pub prng: Prng,
    /// Both sides, indexed by [`SideId::index`].
    pub sides: [Side; 2],
    /// Battle-wide conditions.
    pub field: Field,
    /// The result, once the battle has ended.
    pub outcome: Option<Outcome>,
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

    /// Whether either side must choose a replacement for a fainted creature before the turn.
    #[must_use]
    pub fn awaiting_replacements(&self) -> bool {
        self.sides.iter().any(Side::needs_replacement)
    }
}
