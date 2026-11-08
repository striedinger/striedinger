//! End-of-turn effects.
//!
//! Showdown sorts residual handlers by order, then speed, then sub-order, and checks for faints
//! after each one, so a battle can end partway through the end of a turn.

use super::Engine;
use crate::battle::events::{DamageCause, Event, HealCause, TraitRef};
use crate::battle::state::{SideId, StatusCondition};
use crate::dex::{Fraction, TraitEffect};
use crate::stats::BoostStat;

/// Toxic damage stops growing after this many sixteenths.
const MAX_TOXIC_STAGE: u8 = 15;

#[derive(Clone, Copy, Debug)]
enum Residual {
    Status,
    Heal(TraitRef, Fraction),
    Boost(TraitRef, BoostStat, i8),
}

impl Residual {
    /// Showdown's `onResidualOrder` and `onResidualSubOrder` for each kind of handler.
    fn order(self, status: Option<StatusCondition>) -> (u8, u8) {
        match self {
            Self::Status => match status {
                Some(StatusCondition::Burn) => (10, 0),
                _ => (9, 0),
            },
            Self::Heal(..) => (5, 4),
            Self::Boost(..) => (28, 2),
        }
    }
}

impl Engine<'_> {
    pub(super) fn end_of_turn(&mut self) {
        let order = self.speed_order();
        if self.run_weather(order) {
            return;
        }
        let mut handlers = Vec::new();
        for (rank, &side) in order.iter().enumerate() {
            let pokemon = self.active(side);
            if pokemon.is_fainted() {
                continue;
            }
            let status = pokemon.status;
            if matches!(
                status,
                Some(
                    StatusCondition::Burn | StatusCondition::Poison | StatusCondition::Toxic { .. }
                )
            ) {
                handlers.push((Residual::Status.order(status), rank, side, Residual::Status));
            }
            for (source, effect) in self.trait_effects(side) {
                let handler = match *effect {
                    TraitEffect::EndOfTurnHeal(fraction) => Residual::Heal(source, fraction),
                    TraitEffect::EndOfTurnBoost(stat, stages) => {
                        Residual::Boost(source, stat, stages)
                    }
                    _ => continue,
                };
                handlers.push((handler.order(status), rank, side, handler));
            }
        }
        handlers.sort_by_key(|&((order, sub_order), rank, _, _)| (order, rank, sub_order));
        for (_, _, side, handler) in handlers {
            if self.active(side).is_fainted() {
                continue;
            }
            self.run_residual(side, handler);
            if self.resolve_faints() {
                return;
            }
        }
        for side in SideId::BOTH {
            self.active_mut(side).volatiles.flinched = false;
        }
        self.update();
        self.begin_next_turn();
    }

    /// Counts down the weather and applies its residual damage. Returns whether the battle
    /// ended.
    fn run_weather(&mut self, order: [SideId; 2]) -> bool {
        let Some(mut weather) = self.state.field.weather else {
            return false;
        };
        weather.turns_left = weather.turns_left.saturating_sub(1);
        if weather.turns_left == 0 {
            self.state.field.weather = None;
            self.emit(Event::WeatherEnded {
                weather: weather.id,
            });
            return false;
        }
        self.state.field.weather = Some(weather);
        let data = self.dex.weather(weather.id);
        if let Some(fraction) = data.residual_damage {
            for side in order {
                let pokemon = self.active(side);
                let immune = data
                    .residual_damage_immune_types
                    .iter()
                    .any(|&type_id| pokemon.has_type(type_id));
                if !immune {
                    let amount = fraction.of_floored(u32::from(pokemon.max_hp()));
                    self.damage(side, amount.max(1), DamageCause::Weather);
                }
            }
        }
        self.resolve_faints()
    }

    fn run_residual(&mut self, side: SideId, handler: Residual) {
        let max_hp = u32::from(self.active(side).max_hp());
        match handler {
            Residual::Status => {
                let amount = match &mut self.active_mut(side).status {
                    Some(StatusCondition::Burn) => (max_hp / 16).max(1),
                    Some(StatusCondition::Poison) => (max_hp / 8).max(1),
                    Some(StatusCondition::Toxic { stage }) => {
                        *stage = (*stage + 1).min(MAX_TOXIC_STAGE);
                        (max_hp / 16).max(1) * u32::from(*stage)
                    }
                    _ => return,
                };
                self.damage(side, amount, DamageCause::Status);
            }
            Residual::Heal(source, fraction) => {
                if self.active(side).hp < self.active(side).max_hp() {
                    self.emit(Event::TraitActivated { side, source });
                    self.heal(side, fraction.of_floored(max_hp), HealCause::Trait(source));
                }
            }
            Residual::Boost(source, stat, stages) => {
                if !self.active(side).volatiles.entered_this_turn {
                    self.emit(Event::TraitActivated { side, source });
                    self.boost(side, stat, stages);
                }
            }
        }
    }
}
