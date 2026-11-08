//! End-of-turn ("residual") effects.
//!
//! Showdown sorts residual handlers by `onResidualOrder`, then speed, then sub-order, and runs
//! `faintMessages` after each one, so a battle can end partway through the end of a turn. The
//! orders used here are fixed, so the engine walks them in sequence instead of sorting:
//! weather (1), healing handlers (5), poison and bad poison (9), burn (10), then boosting
//! handlers (28).

use super::Engine;
use crate::battle::events::{DamageSource, Event, HealSource};
use crate::battle::state::SideId;
use crate::dex::{Handler, HandlerMask, Status};

/// Bad poison stops growing after this many sixteenths.
const MAX_TOXIC_STAGE: u8 = 15;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Heal,
    Poison,
    Burn,
    Boosts,
}

impl Engine<'_> {
    pub(super) fn residual(&mut self) {
        let has_work = SideId::BOTH.map(|side| self.has_residual_work(side));
        let weather = self.state.field.weather.is_some();
        let timed_conditions = self.state.sides.iter().any(|team| {
            team.conditions
                .iter()
                .any(|condition| condition.duration.is_some())
        });
        if weather || timed_conditions || has_work.iter().any(|&work| work) {
            // Speed only decides anything when more than one side has a handler.
            let order = if weather || timed_conditions || has_work == [true, true] {
                self.speed_order()
            } else {
                SideId::BOTH
            };
            if self.weather_residual(order) {
                return;
            }
            for phase in [Phase::Heal, Phase::Poison, Phase::Burn] {
                for side in order {
                    if has_work[side.index()] && self.residual_phase(side, phase) {
                        return;
                    }
                }
            }
            for side in order {
                self.side_condition_residual(side);
            }
            for side in order {
                if has_work[side.index()] && self.residual_phase(side, Phase::Boosts) {
                    return;
                }
            }
        }
        for side in SideId::BOTH {
            let volatiles = &mut self.active_mut(side).volatiles;
            volatiles.flinch = false;
            volatiles.protect = false;
            volatiles.stall = volatiles.stall.and_then(|stall| {
                let duration = stall.duration.saturating_sub(1);
                (duration > 0).then_some(crate::battle::state::Stall { duration, ..stall })
            });
        }
        self.update();
        self.next_turn();
    }

    /// Counts down a side's timed conditions, such as screens (Showdown's
    /// `onSideResidualOrder: 26`), and ends those that run out.
    fn side_condition_residual(&mut self, side: SideId) {
        let mut index = 0;
        while index < self.state.side(side).conditions.len() {
            let condition = &mut self.state.sides[side.index()].conditions[index];
            let Some(duration) = condition.duration.as_mut() else {
                index += 1;
                continue;
            };
            *duration = duration.saturating_sub(1);
            if *duration > 0 {
                index += 1;
                continue;
            }
            let ended = self.state.sides[side.index()].conditions.remove(index);
            self.emit(Event::SideEnd {
                side,
                condition: ended.id,
            });
        }
    }

    /// Whether the creature has a residual handler: damaging status or a residual ability or
    /// item.
    fn has_residual_work(&self, side: SideId) -> bool {
        let pokemon = self.active(side);
        !pokemon.is_fainted()
            && (matches!(
                pokemon.status,
                Some(Status::Burn | Status::Poison | Status::Toxic)
            ) || self.mask(side).intersects(HandlerMask::RESIDUAL))
    }

    /// Counts down the weather and deals its residual damage. Returns whether the battle
    /// ended.
    fn weather_residual(&mut self, order: [SideId; 2]) -> bool {
        let Some(mut weather) = self.state.field.weather else {
            return false;
        };
        weather.duration = weather.duration.saturating_sub(1);
        if weather.duration == 0 {
            self.state.field.weather = None;
            self.emit(Event::Weather { weather: None });
            return false;
        }
        self.state.field.weather = Some(weather);
        let data = self.dex.weather(weather.id);
        if let Some(fraction) = data.residual_damage {
            for side in order {
                let pokemon = self.active(side);
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
        self.faint_messages()
    }

    /// Runs one side's handlers for one residual phase. Returns whether the battle ended.
    fn residual_phase(&mut self, side: SideId, phase: Phase) -> bool {
        if self.active(side).is_fainted() {
            return false;
        }
        match phase {
            Phase::Poison | Phase::Burn => {
                let pokemon = self.active_mut(side);
                let Some(status) = pokemon.status else {
                    return false;
                };
                let in_phase = match status {
                    Status::Burn => phase == Phase::Burn,
                    Status::Poison | Status::Toxic => phase == Phase::Poison,
                    Status::Paralysis | Status::Sleep | Status::Freeze => false,
                };
                if !in_phase {
                    return false;
                }
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
                self.faint_messages()
            }
            Phase::Heal | Phase::Boosts => {
                if !self.mask(side).intersects(HandlerMask::RESIDUAL) {
                    return false;
                }
                for (effect, handler) in self.handlers(side) {
                    match *handler {
                        Handler::ResidualHeal(fraction) if phase == Phase::Heal => {
                            let pokemon = self.active(side);
                            if !pokemon.is_fainted() && pokemon.hp < pokemon.max_hp() {
                                let amount =
                                    fraction.of_floored(u32::from(pokemon.max_hp())).max(1);
                                self.heal(side, amount, HealSource::Effect(effect));
                            }
                        }
                        Handler::ResidualBoosts(boosts)
                            if phase == Phase::Boosts && self.active(side).active_turns > 0 =>
                        {
                            self.announce(side, effect);
                            self.boost(side, boosts);
                        }
                        _ => {}
                    }
                    if self.faint_messages() {
                        return true;
                    }
                }
                false
            }
        }
    }
}
