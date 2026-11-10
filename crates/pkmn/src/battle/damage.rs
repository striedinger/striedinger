//! The Generation 5+ damage formula as a pure function, so it can be tested and reused by
//! calculators without running a battle.

use crate::stats::{MODIFIER_SCALE, apply_modifier, saturate_u32};

/// The number of distinct damage rolls: 85% through 100%.
pub const DAMAGE_ROLLS: u32 = 16;

/// Everything the damage formula needs after stats, stages, and type matchups are resolved.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DamageInput {
    /// The attacker's level.
    pub level: u8,
    /// The move's base power.
    pub power: u16,
    /// The attacking stat after stages and modifiers.
    pub attack: u32,
    /// The defending stat after stages and modifiers.
    pub defense: u32,
    /// The 4096-based modifier for a move that hits more than one target:
    /// [`SPREAD_MODIFIER`], or [`FREE_FOR_ALL_SPREAD_MODIFIER`] in free-for-all.
    pub spread: Option<u32>,
    /// A 4096-based weather modifier for the move's type.
    pub weather_modifier: Option<u32>,
    /// Whether the hit is critical.
    pub critical: bool,
    /// The random roll from 0 (100% damage) to 15 (85% damage).
    pub roll: u32,
    /// The 4096-based same-type attack bonus: 6144 (×1.5) normally, 4096 without STAB.
    pub stab_modifier: u32,
    /// Type effectiveness as a power of two.
    pub type_modifier: i8,
    /// Whether a burn halves this hit.
    pub burned: bool,
    /// The 4096-based chain of final damage modifiers from abilities and items.
    pub final_modifier: u32,
}

impl DamageInput {
    /// A neutral hit: no weather, crit, STAB, effectiveness, burn, or final modifiers.
    #[must_use]
    pub fn neutral(level: u8, power: u16, attack: u32, defense: u32) -> Self {
        Self {
            level,
            power,
            attack,
            defense,
            spread: None,
            weather_modifier: None,
            critical: false,
            roll: 0,
            stab_modifier: MODIFIER_SCALE,
            type_modifier: 0,
            burned: false,
            final_modifier: MODIFIER_SCALE,
        }
    }
}

/// The usual same-type attack bonus: ×1.5.
pub const STAB_MODIFIER: u32 = MODIFIER_SCALE * 3 / 2;
/// The modifier for a burned physical attacker: ×0.5.
const BURN_MODIFIER: u32 = MODIFIER_SCALE / 2;

/// Spread moves deal ×0.75 to each target when they hit more than one.
pub const SPREAD_MODIFIER: u32 = MODIFIER_SCALE * 3 / 4;
/// In free-for-all, spread moves deal ×0.5 to each target instead.
pub const FREE_FOR_ALL_SPREAD_MODIFIER: u32 = MODIFIER_SCALE / 2;

/// Calculates the damage of one hit, applying modifiers in the order the games do.
#[must_use]
pub fn calculate_damage(input: &DamageInput) -> u32 {
    let level_factor = u64::from(input.level) * 2 / 5 + 2;
    let defense = u64::from(input.defense.max(1));
    let base = level_factor * u64::from(input.power) * u64::from(input.attack) / defense / 50 + 2;
    let mut damage = saturate_u32(base);
    if let Some(modifier) = input.spread {
        damage = apply_modifier(damage, modifier);
    }
    if let Some(modifier) = input.weather_modifier {
        damage = apply_modifier(damage, modifier);
    }
    if input.critical {
        damage = damage * 3 / 2;
    }
    damage = damage * (100 - input.roll.min(DAMAGE_ROLLS - 1)) / 100;
    damage = apply_modifier(damage, input.stab_modifier);
    let magnitude = u32::from(input.type_modifier.unsigned_abs());
    damage = if input.type_modifier >= 0 {
        damage.checked_shl(magnitude).unwrap_or(u32::MAX)
    } else {
        damage.checked_shr(magnitude).unwrap_or(0)
    };
    if input.burned {
        damage = apply_modifier(damage, BURN_MODIFIER);
    }
    apply_modifier(damage, input.final_modifier).max(1)
}

#[cfg(test)]
mod tests {
    use super::{DamageInput, STAB_MODIFIER, calculate_damage};

    fn neutral_hit() -> DamageInput {
        DamageInput::neutral(50, 80, 100, 100)
    }

    #[test]
    fn computes_the_base_formula_and_the_damage_roll_range() {
        assert_eq!(calculate_damage(&neutral_hit()), 37);
        assert_eq!(
            calculate_damage(&DamageInput {
                roll: 15,
                ..neutral_hit()
            }),
            31
        );
    }

    #[test]
    fn applies_stab_before_type_effectiveness() {
        let input = DamageInput {
            stab_modifier: STAB_MODIFIER,
            type_modifier: 1,
            ..neutral_hit()
        };
        assert_eq!(calculate_damage(&input), 110);
    }

    #[test]
    fn critical_hits_multiply_by_one_and_a_half_rounding_down() {
        assert_eq!(
            calculate_damage(&DamageInput {
                critical: true,
                ..neutral_hit()
            }),
            55
        );
    }

    #[test]
    fn burns_and_resistances_reduce_damage() {
        assert_eq!(
            calculate_damage(&DamageInput {
                burned: true,
                ..neutral_hit()
            }),
            18
        );
        assert_eq!(
            calculate_damage(&DamageInput {
                type_modifier: -2,
                ..neutral_hit()
            }),
            9
        );
    }

    #[test]
    fn final_modifiers_apply_after_everything_else() {
        let input = DamageInput {
            final_modifier: 5324,
            ..neutral_hit()
        };
        assert_eq!(calculate_damage(&input), 48);
    }

    #[test]
    fn every_hit_deals_at_least_one_damage() {
        let input = DamageInput {
            level: 1,
            power: 10,
            attack: 5,
            defense: 500,
            type_modifier: -2,
            ..neutral_hit()
        };
        assert_eq!(calculate_damage(&input), 1);
    }
}
