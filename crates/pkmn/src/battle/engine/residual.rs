//! End-of-turn ("residual") effects, following Showdown's `fieldEvent('Residual')`.
//!
//! Showdown gathers one handler per residual effect on the field, each side, and each active
//! creature, including effects that only count down a duration. It sorts them by order (low
//! first, none last), speed (high first; field and side effects have none), then sub-order,
//! and shuffles each group that ties, which draws `k - 1` random numbers for a group of `k`.
//! Then it runs them in turn: a duration counts down and ends its effect at zero, otherwise the
//! handler runs, and `faintMessages` follows each, so a battle can end partway through.
//!
//! The engine builds the same list in Showdown's gathering order and sorts it the same way, so
//! it draws the same numbers and runs ties in the same order. The orders are Showdown's:
//!
//! | Order | Sub-order | Handler                                   |
//! | ----- | --------- | ----------------------------------------- |
//! | 1     | 5         | Weather                                   |
//! | 5     | 2         | Terrain healing (Grassy Terrain)          |
//! | 5     | 4         | `residualHeal` (Leftovers)                |
//! | 9     | 0         | Poison and bad poison                     |
//! | 10    | 0         | Burn                                      |
//! | data  | data      | Side conditions with a duration: screens at 26, Wide Guard with none |
//! | data  | data      | Pseudo-weathers: Trick Room at 27, 1      |
//! | 27    | 7         | Terrain                                   |
//! | 28    | 2         | `residualBoosts` (Speed Boost)            |
//! | none  | 2         | Volatiles with a duration                 |

use super::Engine;
use crate::battle::events::{DamageSource, Effect, Event, HealSource};
use crate::battle::state::{MoveRestriction, Position, SideId, Stall};
use crate::dex::{Fraction, Handler, HandlerMask, Status, VolatileStatus};
use crate::stats::Boosts;

/// Bad poison stops growing after this many sixteenths.
const MAX_TOXIC_STAGE: u8 = 15;
/// Showdown sorts handlers without an order after every other.
const NO_ORDER: u32 = u32::MAX;
/// Showdown's default sub-order for conditions on a creature (`effectTypeOrder.Condition`).
const VOLATILE_SUB_ORDER: u8 = 2;
/// At most: weather, terrain and six pseudo-weathers, then per side five conditions and, for
/// each of its three positions, a status, an ability and an item handler, terrain healing, and
/// eight volatiles.
const MAX_HANDLERS: usize = 8 + 2 * (5 + 3 * 12);

/// A volatile that only counts down at the end of the turn.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Volatile {
    LockedMove,
    TwoTurnMove,
    /// The move's own volatile while charging a semi-invulnerable move, like Fly's.
    SemiInvulnerable,
    Protect,
    Stall,
    Flinch,
    FollowMe,
    HelpingHand,
    Taunt,
    Encore,
    Disable,
}

impl Volatile {
    /// Showdown's `onResidualOrder`: Taunt 15, Encore 16, Disable 17; the others have none.
    fn order(self) -> u32 {
        match self {
            Self::Taunt => 15,
            Self::Encore => 16,
            Self::Disable => 17,
            _ => NO_ORDER,
        }
    }
}

/// One end-of-turn check off Encore or Disable, ending it at zero.
fn count_down(restriction: Option<MoveRestriction>) -> Option<MoveRestriction> {
    restriction
        .map(|restriction| MoveRestriction {
            duration: restriction.duration.saturating_sub(1),
            ..restriction
        })
        .filter(|restriction| restriction.duration > 0)
}

/// Showdown's Leech Seed `onResidualOrder`.
const LEECH_SEED_ORDER: u32 = 8;

/// What one residual handler does.
#[derive(Clone, Copy, Debug)]
enum Residual {
    Weather,
    Terrain,
    PseudoWeather(crate::dex::PseudoWeatherId),
    SideCondition(SideId, crate::dex::SideConditionId),
    Status(Position),
    TerrainHeal(Position),
    Heal(Position, Effect, Fraction),
    Boosts(Position, Effect, Boosts),
    Volatile(Position, Volatile),
    LeechSeed(Position),
}

#[derive(Clone, Copy, Debug)]
struct Entry {
    order: u32,
    speed: u32,
    sub_order: u8,
    residual: Residual,
}

impl Entry {
    /// Showdown's `comparePriority` (every residual priority here is 0): negative when `self`
    /// runs first.
    fn compare(&self, other: &Self) -> std::cmp::Ordering {
        self.order
            .cmp(&other.order)
            .then(other.speed.cmp(&self.speed))
            .then(self.sub_order.cmp(&other.sub_order))
    }
}

/// A fixed-capacity list, so the end of a turn does not allocate.
struct Handlers {
    entries: [Entry; MAX_HANDLERS],
    len: usize,
}

impl Handlers {
    fn push(&mut self, order: u32, speed: u32, sub_order: u8, residual: Residual) {
        if let Some(entry) = self.entries.get_mut(self.len) {
            *entry = Entry {
                order,
                speed,
                sub_order,
                residual,
            };
            self.len += 1;
        }
    }
}

impl Engine<'_> {
    pub(super) fn residual(&mut self) {
        // The `residual` action starts by updating every cached speed.
        self.update_speeds();
        let mut handlers = Handlers {
            entries: [Entry {
                order: NO_ORDER,
                speed: 0,
                sub_order: 0,
                residual: Residual::Weather,
            }; MAX_HANDLERS],
            len: 0,
        };
        self.gather_residuals(&mut handlers);
        let list = &mut handlers.entries[..handlers.len];
        self.speed_sort(list, Entry::compare);
        for index in 0..handlers.len {
            let entry = handlers.entries[index];
            if self.run_residual(entry.residual) && self.faint_messages() {
                return;
            }
        }
        self.update();
        self.next_turn();
    }

    /// Lists the handlers in Showdown's gathering order: the field's, then for each side its
    /// conditions and its active creature's status, volatiles, ability, item, and terrain
    /// healing.
    fn gather_residuals(&self, handlers: &mut Handlers) {
        for state in &self.state.field.pseudo_weathers {
            let data = self.dex.pseudo_weather(state.id);
            handlers.push(
                data.residual_order.map_or(NO_ORDER, u32::from),
                0,
                data.residual_sub_order,
                Residual::PseudoWeather(state.id),
            );
        }
        if self.state.field.weather.is_some() {
            handlers.push(1, 0, 5, Residual::Weather);
        }
        if self.state.field.terrain.is_some() {
            handlers.push(27, 0, 7, Residual::Terrain);
        }
        for team in self.state.side_ids() {
            for condition in &self.state.side(team).conditions {
                if condition.duration.is_some() {
                    let data = self.dex.side_condition(condition.id);
                    handlers.push(
                        data.residual_order.map_or(NO_ORDER, u32::from),
                        0,
                        data.residual_sub_order,
                        Residual::SideCondition(team, condition.id),
                    );
                }
            }
            for side in self
                .positions()
                .iter()
                .filter(|position| position.side == team)
            {
                self.gather_creature_residuals(side, handlers);
            }
        }
    }

    /// One active creature's residual handlers: its status, volatiles, ability, item, and
    /// terrain healing.
    fn gather_creature_residuals(&self, side: Position, handlers: &mut Handlers) {
        {
            let pokemon = self.active(side);
            // Deliberate difference: Showdown keeps a fainted creature's ability and item
            // handlers in the sort, at its last speed, though they never run. They can only tie
            // with another creature's at that exact speed, a speed tie.
            if pokemon.is_fainted() {
                return;
            }
            // Showdown's handlers take the speed cached when `residual` started.
            let speed = pokemon.speed;
            match pokemon.status {
                Some(Status::Poison | Status::Toxic) => {
                    handlers.push(9, speed, 0, Residual::Status(side));
                }
                Some(Status::Burn) => handlers.push(10, speed, 0, Residual::Status(side)),
                _ => {}
            }
            let volatiles = &pokemon.volatiles;
            if volatiles.leech_seed.is_some() {
                handlers.push(
                    LEECH_SEED_ORDER,
                    speed,
                    VOLATILE_SUB_ORDER,
                    Residual::LeechSeed(side),
                );
            }
            let charge_volatile = volatiles.charging.is_some() && self.is_semi_invulnerable(side);
            for (present, volatile) in [
                (volatiles.locked_move.is_some(), Volatile::LockedMove),
                (volatiles.two_turn_move > 0, Volatile::TwoTurnMove),
                (charge_volatile, Volatile::SemiInvulnerable),
                (volatiles.protect, Volatile::Protect),
                (volatiles.stall.is_some(), Volatile::Stall),
                (volatiles.flinch, Volatile::Flinch),
                (volatiles.follow_me, Volatile::FollowMe),
                (volatiles.helping_hand > 0, Volatile::HelpingHand),
                (volatiles.taunt.is_some(), Volatile::Taunt),
                (volatiles.encore.is_some(), Volatile::Encore),
                (volatiles.disable.is_some(), Volatile::Disable),
            ] {
                if present {
                    handlers.push(
                        volatile.order(),
                        speed,
                        VOLATILE_SUB_ORDER,
                        Residual::Volatile(side, volatile),
                    );
                }
            }
            if self.mask(side).intersects(HandlerMask::RESIDUAL) {
                for (effect, handler) in self.handlers(side) {
                    match *handler {
                        Handler::ResidualHeal(fraction) => {
                            handlers.push(5, speed, 4, Residual::Heal(side, effect, fraction));
                        }
                        Handler::ResidualBoosts(boosts) => {
                            handlers.push(28, speed, 2, Residual::Boosts(side, effect, boosts));
                        }
                        _ => {}
                    }
                }
            }
            // Grassy Terrain's `onResidual` is gathered for every active creature; it checks
            // grounding when it runs.
            if let Some(terrain) = self.state.field.terrain
                && self.dex.terrain(terrain.id).residual_heal.is_some()
            {
                handlers.push(5, speed, 2, Residual::TerrainHeal(side));
            }
        }
    }

    /// Showdown's Fisher-Yates `shuffle`.
    pub(super) fn shuffle<T>(&mut self, items: &mut [T]) {
        let Ok(end) = u32::try_from(items.len()) else {
            return;
        };
        for start in 0..end.saturating_sub(1) {
            let next = self.state.prng.range(start, end);
            if let (Ok(start), Ok(next)) = (usize::try_from(start), usize::try_from(next)) {
                items.swap(start, next);
            }
        }
    }

    /// Runs one handler. Returns whether it did something after which Showdown checks for
    /// faints; a duration running out does not.
    fn run_residual(&mut self, residual: Residual) -> bool {
        match residual {
            Residual::Weather => return self.weather_residual(),
            Residual::Terrain => self.terrain_residual(),
            Residual::LeechSeed(side) => return self.leech_seed_residual(side),
            Residual::PseudoWeather(id) => self.pseudo_weather_residual(id),
            Residual::SideCondition(side, id) => self.side_condition_residual(side, id),
            Residual::Volatile(side, volatile) => return self.volatile_residual(side, volatile),
            Residual::Status(side) => self.status_residual(side),
            Residual::TerrainHeal(side) => {
                if self.active(side).is_fainted() {
                    return false;
                }
                let heal = self
                    .terrain_affecting(side, |terrain| terrain.residual_heal.is_some())
                    .and_then(|terrain| terrain.residual_heal);
                if let (Some(fraction), Some(terrain)) = (heal, self.state.field.terrain) {
                    let max_hp = u32::from(self.active(side).max_hp());
                    self.heal(
                        side,
                        fraction.of_floored(max_hp).max(1),
                        HealSource::Terrain(terrain.id),
                    );
                }
            }
            Residual::Heal(side, effect, fraction) => {
                let pokemon = self.active(side);
                if pokemon.is_fainted() {
                    return false;
                }
                if pokemon.hp < pokemon.max_hp() {
                    let amount = fraction.of_floored(u32::from(pokemon.max_hp())).max(1);
                    self.heal(side, amount, HealSource::Effect(effect));
                }
            }
            Residual::Boosts(side, effect, boosts) => {
                if self.active(side).is_fainted() {
                    return false;
                }
                if self.active(side).active_turns > 0 {
                    self.announce(side, effect);
                    self.boost(side, boosts);
                }
            }
        }
        true
    }

    /// Counts down the weather and deals its residual damage. Returns whether the weather is
    /// still up, so the faint check follows.
    fn weather_residual(&mut self) -> bool {
        let Some(mut weather) = self.state.field.weather else {
            return false;
        };
        weather.duration = weather.duration.saturating_sub(1);
        if weather.duration == 0 {
            self.state.field.weather = None;
            self.emit(Event::Weather { weather: None });
            // `clearWeather`'s `eachEvent('WeatherChange')`.
            self.each_event();
            return false;
        }
        self.state.field.weather = Some(weather);
        let data = self.dex.weather(weather.id);
        // Showdown's `eachEvent('Weather')` sorts the creatures that have not fainted, whether
        // or not the weather hurts them.
        let order = self.each_event();
        if let Some(fraction) = data.residual_damage {
            for side in order.iter() {
                let pokemon = self.active(side);
                if pokemon.is_fainted() {
                    continue;
                }
                let immune = pokemon.types().any(|type_id| {
                    self.dex
                        .type_data(type_id)
                        .weather_immunities
                        .contains(&weather.id)
                });
                if !immune {
                    let amount = fraction.of_floored(u32::from(pokemon.max_hp()));
                    self.damage(side, amount.max(1), DamageSource::Weather(weather.id));
                }
            }
        }
        // Showdown's weather handler ends with an `Update`, before the faint check.
        self.update();
        true
    }

    /// Counts down the terrain (Showdown's `onFieldResidualOrder: 27`).
    fn terrain_residual(&mut self) {
        let Some(mut terrain) = self.state.field.terrain else {
            return;
        };
        terrain.duration = terrain.duration.saturating_sub(1);
        if terrain.duration == 0 {
            self.state.field.terrain = None;
            self.emit(Event::Terrain { terrain: None });
            self.each_event();
        } else {
            self.state.field.terrain = Some(terrain);
        }
    }

    /// Leech Seed drains 1/8 of the seeded creature's max HP into whoever stands in the
    /// seeder's position, if anyone does. Returns whether it drained.
    fn leech_seed_residual(&mut self, side: Position) -> bool {
        let pokemon = self.active(side);
        let Some(source) = pokemon
            .volatiles
            .leech_seed
            .filter(|_| !pokemon.is_fainted())
        else {
            return false;
        };
        let max_hp = u32::from(pokemon.max_hp());
        if !self.positions().iter().any(|open| open == source) || self.active(source).is_fainted() {
            return false;
        }
        let dealt = self.damage(side, (max_hp / 8).max(1), DamageSource::LeechSeed);
        if dealt > 0 {
            self.heal(source, dealt, HealSource::LeechSeed);
        }
        true
    }

    /// Counts down a pseudo-weather, like Trick Room, and ends it at zero.
    fn pseudo_weather_residual(&mut self, id: crate::dex::PseudoWeatherId) {
        let field = &mut self.state.field.pseudo_weathers;
        let Some(index) = field.iter().position(|state| state.id == id) else {
            return;
        };
        field[index].duration = field[index].duration.saturating_sub(1);
        if field[index].duration == 0 {
            field.remove(index);
            self.emit(Event::PseudoWeatherEnd { pseudo_weather: id });
        }
    }

    /// Counts down a timed side condition, such as a screen, and ends it at zero.
    fn side_condition_residual(&mut self, side: SideId, id: crate::dex::SideConditionId) {
        let conditions = &mut self.state.sides[side.index()].conditions;
        let Some(index) = conditions.iter().position(|condition| condition.id == id) else {
            return;
        };
        let Some(duration) = conditions[index].duration.as_mut() else {
            return;
        };
        *duration = duration.saturating_sub(1);
        if *duration == 0 {
            conditions.remove(index);
            self.emit(Event::SideEnd {
                side,
                condition: id,
            });
        }
    }

    /// Poison, bad poison, and burn damage.
    fn status_residual(&mut self, side: Position) {
        let pokemon = self.active_mut(side);
        if pokemon.is_fainted() {
            return;
        }
        let Some(status @ (Status::Burn | Status::Poison | Status::Toxic)) = pokemon.status else {
            return;
        };
        if status == Status::Toxic {
            pokemon.status_state.stage = pokemon
                .status_state
                .stage
                .saturating_add(1)
                .min(MAX_TOXIC_STAGE);
        }
        let amount = Self::status_damage(
            status,
            u32::from(pokemon.max_hp()),
            pokemon.status_state.stage,
        );
        self.damage(side, amount, DamageSource::Status(status));
    }

    /// Counts down a volatile, ending it at zero. Only a rampage also has a handler: sleep ends
    /// it quietly, and running out ends it with confusion. Returns whether the handler ran.
    fn volatile_residual(&mut self, side: Position, volatile: Volatile) -> bool {
        let pokemon = self.active_mut(side);
        let volatiles = &mut pokemon.volatiles;
        match volatile {
            Volatile::Protect => volatiles.protect = false,
            Volatile::Flinch => volatiles.flinch = false,
            Volatile::FollowMe => volatiles.follow_me = false,
            Volatile::HelpingHand => volatiles.helping_hand = 0,
            Volatile::Taunt => {
                volatiles.taunt = volatiles
                    .taunt
                    .and_then(|left| left.checked_sub(1))
                    .filter(|&left| left > 0);
                if volatiles.taunt.is_none() {
                    self.emit(Event::End {
                        pokemon: side,
                        volatile: VolatileStatus::Taunt,
                    });
                }
            }
            Volatile::Disable => {
                volatiles.disable = count_down(volatiles.disable);
                if volatiles.disable.is_none() {
                    self.emit(Event::End {
                        pokemon: side,
                        volatile: VolatileStatus::Disable,
                    });
                }
            }
            // Encore also ends once its move is out of PP (its `onResidual`).
            Volatile::Encore => {
                volatiles.encore = count_down(volatiles.encore).filter(|encore| {
                    pokemon
                        .move_slots
                        .iter()
                        .flatten()
                        .any(|known| known.id == encore.move_id && known.pp > 0)
                });
                if volatiles.encore.is_none() {
                    self.emit(Event::End {
                        pokemon: side,
                        volatile: VolatileStatus::Encore,
                    });
                }
                return true;
            }
            Volatile::Stall => {
                volatiles.stall = volatiles.stall.and_then(|stall| {
                    let duration = stall.duration.saturating_sub(1);
                    (duration > 0).then_some(Stall { duration, ..stall })
                });
            }
            Volatile::TwoTurnMove => {
                volatiles.two_turn_move = volatiles.two_turn_move.saturating_sub(1);
                if volatiles.two_turn_move == 0 {
                    // `twoturnmove`'s `onEnd` removes the move's own volatile.
                    volatiles.charging = None;
                }
            }
            // It counts down from 2, and the move removes it before it could run out.
            Volatile::SemiInvulnerable => {}
            Volatile::LockedMove => {
                let asleep = pokemon.status == Some(Status::Sleep);
                let Some(mut locked) = volatiles.locked_move else {
                    return false;
                };
                locked.duration = locked.duration.saturating_sub(1);
                if locked.duration == 0 {
                    volatiles.locked_move = Some(locked);
                    self.end_lock(side);
                    return false;
                }
                if asleep {
                    volatiles.locked_move = None;
                } else {
                    locked.true_duration = locked.true_duration.saturating_sub(1);
                    volatiles.locked_move = Some(locked);
                }
                return true;
            }
        }
        false
    }
}
