//! Stats, stat stages, and the fixed-point arithmetic the games use for modifiers.

use serde::{Deserialize, Serialize};

/// One of the six permanent stats.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Stat {
    /// Hit points.
    Hp,
    /// Physical attack.
    Attack,
    /// Physical defense.
    Defense,
    /// Special attack.
    SpecialAttack,
    /// Special defense.
    SpecialDefense,
    /// Speed.
    Speed,
}

/// A value for each of the six permanent stats.
///
/// Omitted fields deserialize as zero, which keeps EV spreads short in data files.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct StatTable {
    /// Hit points.
    pub hp: u16,
    /// Physical attack.
    pub attack: u16,
    /// Physical defense.
    pub defense: u16,
    /// Special attack.
    pub special_attack: u16,
    /// Special defense.
    pub special_defense: u16,
    /// Speed.
    pub speed: u16,
}

impl StatTable {
    /// Returns the value for `stat`.
    #[must_use]
    pub fn get(&self, stat: Stat) -> u16 {
        match stat {
            Stat::Hp => self.hp,
            Stat::Attack => self.attack,
            Stat::Defense => self.defense,
            Stat::SpecialAttack => self.special_attack,
            Stat::SpecialDefense => self.special_defense,
            Stat::Speed => self.speed,
        }
    }

    fn values(&self) -> [u16; 6] {
        [
            self.hp,
            self.attack,
            self.defense,
            self.special_attack,
            self.special_defense,
            self.speed,
        ]
    }

    /// Returns the sum of all six values.
    #[must_use]
    pub fn total(&self) -> u32 {
        self.values().into_iter().map(u32::from).sum()
    }

    /// Returns the largest of the six values.
    #[must_use]
    pub fn max(&self) -> u16 {
        self.values().into_iter().max().unwrap_or(0)
    }
}

/// A nature raises one non-HP stat by 10% and lowers another by 10%.
///
/// Neutral natures are represented by omitting the nature entirely.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Nature {
    /// The stat multiplied by 1.1.
    pub increased: Stat,
    /// The stat multiplied by 0.9.
    pub decreased: Stat,
}

/// The highest individual value a stat can have.
pub const MAX_IV: u16 = 31;
/// The most effort values a single stat can have.
pub const MAX_EV: u16 = 252;
/// The most effort values a creature can have across all stats.
pub const MAX_TOTAL_EVS: u32 = 510;

/// Calculates a creature's permanent stats with the Generation 3+ formulas.
#[must_use]
pub fn calculate_stats(
    base: &StatTable,
    ivs: &StatTable,
    evs: &StatTable,
    level: u8,
    nature: Option<Nature>,
) -> StatTable {
    let level = u32::from(level);
    let core = |stat: Stat| {
        (2 * u32::from(base.get(stat)) + u32::from(ivs.get(stat)) + u32::from(evs.get(stat)) / 4)
            * level
            / 100
    };
    let other = |stat: Stat| {
        let mut value = core(stat) + 5;
        if let Some(nature) = nature
            && nature.increased != nature.decreased
        {
            if nature.increased == stat {
                value = value * 110 / 100;
            } else if nature.decreased == stat {
                value = value * 90 / 100;
            }
        }
        saturate_u16(value)
    };
    let hp = if base.hp == 1 {
        1
    } else {
        saturate_u16(core(Stat::Hp) + level + 10)
    };
    StatTable {
        hp,
        attack: other(Stat::Attack),
        defense: other(Stat::Defense),
        special_attack: other(Stat::SpecialAttack),
        special_defense: other(Stat::SpecialDefense),
        speed: other(Stat::Speed),
    }
}

/// A stat that can be raised or lowered temporarily during battle.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BoostStat {
    /// Physical attack.
    Attack,
    /// Physical defense.
    Defense,
    /// Special attack.
    SpecialAttack,
    /// Special defense.
    SpecialDefense,
    /// Speed.
    Speed,
    /// Accuracy.
    Accuracy,
    /// Evasion.
    Evasion,
}

impl BoostStat {
    const COUNT: usize = 7;

    fn index(self) -> usize {
        self as usize
    }
}

/// Stat stages from -6 to +6, reset when the creature switches out.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Boosts([i8; BoostStat::COUNT]);

impl Boosts {
    /// The highest and lowest stage a stat can reach.
    pub const LIMIT: i8 = 6;

    /// Returns the current stage of `stat`.
    #[must_use]
    pub fn get(&self, stat: BoostStat) -> i8 {
        self.0[stat.index()]
    }

    /// Changes `stat` by `stages`, clamped to ±6, and returns the change that actually applied.
    pub fn apply(&mut self, stat: BoostStat, stages: i8) -> i8 {
        let current = self.0[stat.index()];
        let next = current
            .saturating_add(stages)
            .clamp(-Self::LIMIT, Self::LIMIT);
        self.0[stat.index()] = next;
        next - current
    }
}

/// Applies an attack, defense, special, or speed stage to a stat.
#[must_use]
pub fn apply_stage(value: u16, stage: i8) -> u32 {
    let value = u32::from(value);
    let magnitude = u32::from(stage.unsigned_abs());
    if stage >= 0 {
        value * (2 + magnitude) / 2
    } else {
        value * 2 / (2 + magnitude)
    }
}

/// Applies an accuracy stage (net of the target's evasion) to a move's accuracy.
#[must_use]
pub fn apply_accuracy_stage(accuracy: u32, stage: i8) -> u32 {
    let magnitude = u32::from(stage.unsigned_abs());
    if stage >= 0 {
        accuracy * (3 + magnitude) / 3
    } else {
        accuracy * 3 / (3 + magnitude)
    }
}

/// The fixed-point scale the games use for modifiers: 4096 is ×1.
pub const MODIFIER_SCALE: u32 = 4096;

/// Multiplies `value` by a 4096-based modifier, rounding exact halves down like the games do.
#[must_use]
pub fn apply_modifier(value: u32, modifier: u32) -> u32 {
    let product = u64::from(value) * u64::from(modifier) + u64::from(MODIFIER_SCALE / 2 - 1);
    saturate_u32(product / u64::from(MODIFIER_SCALE))
}

pub(crate) fn saturate_u16(value: u32) -> u16 {
    u16::try_from(value).unwrap_or(u16::MAX)
}

pub(crate) fn saturate_u32(value: u64) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn uniform(value: u16) -> StatTable {
        StatTable {
            hp: value,
            attack: value,
            defense: value,
            special_attack: value,
            special_defense: value,
            speed: value,
        }
    }

    #[test]
    fn calculates_level_100_stats_with_full_investment_and_nature() {
        let evs = StatTable {
            hp: 252,
            attack: 252,
            ..StatTable::default()
        };
        let nature = Nature {
            increased: Stat::Attack,
            decreased: Stat::SpecialAttack,
        };
        let stats = calculate_stats(&uniform(100), &uniform(31), &evs, 100, Some(nature));
        assert_eq!(stats.hp, 404);
        assert_eq!(stats.attack, 328);
        assert_eq!(stats.defense, 236);
        assert_eq!(stats.special_attack, 212);
    }

    #[test]
    fn a_base_hp_of_one_always_yields_one_hit_point() {
        let base = StatTable {
            hp: 1,
            ..uniform(90)
        };
        let stats = calculate_stats(&base, &uniform(31), &uniform(252), 100, None);
        assert_eq!(stats.hp, 1);
    }

    #[test]
    fn stat_stages_scale_by_halves() {
        assert_eq!(apply_stage(100, 2), 200);
        assert_eq!(apply_stage(100, -1), 66);
        assert_eq!(apply_stage(100, -6), 25);
        assert_eq!(apply_accuracy_stage(100, -1), 75);
        assert_eq!(apply_accuracy_stage(90, 1), 120);
    }

    #[test]
    fn boosts_clamp_at_six_and_report_the_applied_change() {
        let mut boosts = Boosts::default();
        assert_eq!(boosts.apply(BoostStat::Attack, 4), 4);
        assert_eq!(boosts.apply(BoostStat::Attack, 4), 2);
        assert_eq!(boosts.apply(BoostStat::Attack, 1), 0);
        assert_eq!(boosts.get(BoostStat::Attack), 6);
    }

    #[test]
    fn modifiers_round_exact_halves_down() {
        assert_eq!(apply_modifier(100, 6144), 150);
        assert_eq!(apply_modifier(3, 6144), 4);
        assert_eq!(apply_modifier(5, 6144), 7);
        assert_eq!(apply_modifier(37, 2048), 18);
    }
}
