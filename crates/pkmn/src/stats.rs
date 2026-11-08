//! Stats, stat stages ("boosts"), natures, and the fixed-point arithmetic the games use for
//! modifiers. Serialized names follow Pokémon Showdown: `hp`, `atk`, `def`, `spa`, `spd`, `spe`.

use serde::{Deserialize, Serialize};

/// One of the six permanent stats.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Stat {
    /// Hit points.
    #[serde(rename = "hp")]
    Hp,
    /// Attack.
    #[serde(rename = "atk")]
    Attack,
    /// Defense.
    #[serde(rename = "def")]
    Defense,
    /// Special Attack.
    #[serde(rename = "spa")]
    SpecialAttack,
    /// Special Defense.
    #[serde(rename = "spd")]
    SpecialDefense,
    /// Speed.
    #[serde(rename = "spe")]
    Speed,
}

/// A value for each permanent stat, like Showdown's `StatsTable`.
///
/// Omitted fields deserialize as zero, which keeps EV spreads short in data files.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct StatTable {
    /// Hit points.
    pub hp: u16,
    /// Attack.
    #[serde(rename = "atk")]
    pub attack: u16,
    /// Defense.
    #[serde(rename = "def")]
    pub defense: u16,
    /// Special Attack.
    #[serde(rename = "spa")]
    pub special_attack: u16,
    /// Special Defense.
    #[serde(rename = "spd")]
    pub special_defense: u16,
    /// Speed.
    #[serde(rename = "spe")]
    pub speed: u16,
}

impl StatTable {
    /// The same value for every stat.
    #[must_use]
    pub fn uniform(value: u16) -> Self {
        Self {
            hp: value,
            attack: value,
            defense: value,
            special_attack: value,
            special_defense: value,
            speed: value,
        }
    }

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

    /// Returns the smallest of the six values.
    #[must_use]
    pub fn min(&self) -> u16 {
        self.values().into_iter().min().unwrap_or(0)
    }
}

/// A nature's effect: `plus` is multiplied by 1.1 and `minus` by 0.9. Neutral natures have
/// neither.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Nature {
    /// The raised stat.
    pub plus: Stat,
    /// The lowered stat.
    pub minus: Stat,
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
            && nature.plus != nature.minus
        {
            if nature.plus == stat {
                value = value * 110 / 100;
            } else if nature.minus == stat {
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

/// A stat that has stages ("boosts") during battle, like Showdown's `BoostID`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BoostStat {
    /// Attack.
    #[serde(rename = "atk")]
    Attack,
    /// Defense.
    #[serde(rename = "def")]
    Defense,
    /// Special Attack.
    #[serde(rename = "spa")]
    SpecialAttack,
    /// Special Defense.
    #[serde(rename = "spd")]
    SpecialDefense,
    /// Speed.
    #[serde(rename = "spe")]
    Speed,
    /// Accuracy.
    #[serde(rename = "accuracy")]
    Accuracy,
    /// Evasion.
    #[serde(rename = "evasion")]
    Evasion,
}

impl BoostStat {
    /// Every boostable stat, in Showdown's order.
    pub const ALL: [Self; 7] = [
        Self::Attack,
        Self::Defense,
        Self::SpecialAttack,
        Self::SpecialDefense,
        Self::Speed,
        Self::Accuracy,
        Self::Evasion,
    ];
}

/// Stat stages from -6 to +6, like Showdown's `BoostsTable`. Used both for a creature's current
/// stages and for a move's `boosts`, where omitted stats are zero.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Boosts {
    /// Attack stages.
    #[serde(rename = "atk")]
    pub attack: i8,
    /// Defense stages.
    #[serde(rename = "def")]
    pub defense: i8,
    /// Special Attack stages.
    #[serde(rename = "spa")]
    pub special_attack: i8,
    /// Special Defense stages.
    #[serde(rename = "spd")]
    pub special_defense: i8,
    /// Speed stages.
    #[serde(rename = "spe")]
    pub speed: i8,
    /// Accuracy stages.
    pub accuracy: i8,
    /// Evasion stages.
    pub evasion: i8,
}

impl Boosts {
    /// The highest and lowest stage a stat can reach.
    pub const LIMIT: i8 = 6;

    fn slot(&mut self, stat: BoostStat) -> &mut i8 {
        match stat {
            BoostStat::Attack => &mut self.attack,
            BoostStat::Defense => &mut self.defense,
            BoostStat::SpecialAttack => &mut self.special_attack,
            BoostStat::SpecialDefense => &mut self.special_defense,
            BoostStat::Speed => &mut self.speed,
            BoostStat::Accuracy => &mut self.accuracy,
            BoostStat::Evasion => &mut self.evasion,
        }
    }

    /// Returns the stage of `stat`.
    #[must_use]
    pub fn get(&self, stat: BoostStat) -> i8 {
        match stat {
            BoostStat::Attack => self.attack,
            BoostStat::Defense => self.defense,
            BoostStat::SpecialAttack => self.special_attack,
            BoostStat::SpecialDefense => self.special_defense,
            BoostStat::Speed => self.speed,
            BoostStat::Accuracy => self.accuracy,
            BoostStat::Evasion => self.evasion,
        }
    }

    /// The non-zero entries, in Showdown's order.
    pub fn changes(&self) -> impl Iterator<Item = (BoostStat, i8)> + use<> {
        let boosts = *self;
        BoostStat::ALL
            .into_iter()
            .map(move |stat| (stat, boosts.get(stat)))
            .filter(|&(_, stages)| stages != 0)
    }

    /// Whether every entry is zero.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        *self == Self::default()
    }

    /// Changes `stat` by `stages`, clamped to ±6, and returns the change that actually applied.
    pub fn apply(&mut self, stat: BoostStat, stages: i8) -> i8 {
        let slot = self.slot(stat);
        let current = *slot;
        *slot = current
            .saturating_add(stages)
            .clamp(-Self::LIMIT, Self::LIMIT);
        *slot - current
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

/// Multiplies `value` by a 4096-based modifier, rounding exact halves down like Showdown's
/// `modify`.
#[must_use]
pub fn apply_modifier(value: u32, modifier: u32) -> u32 {
    if modifier == MODIFIER_SCALE {
        return value;
    }
    let product = u64::from(value) * u64::from(modifier) + u64::from(MODIFIER_SCALE / 2 - 1);
    saturate_u32(product / u64::from(MODIFIER_SCALE))
}

/// Combines 4096-based modifiers, rounding each step like Showdown's `chainModify`.
#[must_use]
pub fn chain_modifiers(modifiers: impl IntoIterator<Item = u32>) -> u32 {
    modifiers.into_iter().fold(MODIFIER_SCALE, |total, next| {
        let product = u64::from(total) * u64::from(next) + u64::from(MODIFIER_SCALE / 2);
        saturate_u32(product >> 12)
    })
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

    #[test]
    fn calculates_level_100_stats_with_full_investment_and_nature() {
        let evs = StatTable {
            hp: 252,
            attack: 252,
            ..StatTable::default()
        };
        let adamant = Nature {
            plus: Stat::Attack,
            minus: Stat::SpecialAttack,
        };
        let stats = calculate_stats(
            &StatTable::uniform(100),
            &StatTable::uniform(31),
            &evs,
            100,
            Some(adamant),
        );
        assert_eq!(stats.hp, 404);
        assert_eq!(stats.attack, 328);
        assert_eq!(stats.defense, 236);
        assert_eq!(stats.special_attack, 212);
    }

    #[test]
    fn a_base_hp_of_one_always_yields_one_hit_point() {
        let base = StatTable {
            hp: 1,
            ..StatTable::uniform(90)
        };
        let stats = calculate_stats(
            &base,
            &StatTable::uniform(31),
            &StatTable::uniform(252),
            100,
            None,
        );
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

    #[test]
    fn chained_modifiers_round_at_each_step() {
        assert_eq!(chain_modifiers([]), 4096);
        assert_eq!(chain_modifiers([6144, 6144]), 9216);
        assert_eq!(chain_modifiers([5324, 4915]), 6389);
    }
}
