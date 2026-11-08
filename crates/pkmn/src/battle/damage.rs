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
    /// A 4096-based weather modifier for the move's type.
    pub weather_modifier: Option<u32>,
    /// Whether the hit is critical.
    pub critical: bool,
    /// The random roll from 0 (100% damage) to 15 (85% damage).
    pub roll: u32,
    /// Whether the attacker shares the move's type.
    pub same_type_attack_bonus: bool,
    /// Type effectiveness as a power of two.
    pub type_modifier: i8,
    /// Whether a burn halves this hit.
    pub burned: bool,
}

/// The modifier for a same-type attack bonus: ×1.5.
const STAB_MODIFIER: u32 = MODIFIER_SCALE * 3 / 2;
/// The modifier for a burned physical attacker: ×0.5.
const BURN_MODIFIER: u32 = MODIFIER_SCALE / 2;

/// Calculates the damage of one hit, applying modifiers in the order the games do.
#[must_use]
pub fn calculate_damage(input: &DamageInput) -> u32 {
    let level_factor = u64::from(input.level) * 2 / 5 + 2;
    let defense = u64::from(input.defense.max(1));
    let base = level_factor * u64::from(input.power) * u64::from(input.attack) / defense / 50 + 2;
    let mut damage = saturate_u32(base);
    if let Some(modifier) = input.weather_modifier {
        damage = apply_modifier(damage, modifier);
    }
    if input.critical {
        damage = damage * 3 / 2;
    }
    damage = damage * (100 - input.roll.min(DAMAGE_ROLLS - 1)) / 100;
    if input.same_type_attack_bonus {
        damage = apply_modifier(damage, STAB_MODIFIER);
    }
    let magnitude = u32::from(input.type_modifier.unsigned_abs());
    damage = if input.type_modifier >= 0 {
        damage.checked_shl(magnitude).unwrap_or(u32::MAX)
    } else {
        damage.checked_shr(magnitude).unwrap_or(0)
    };
    if input.burned {
        damage = apply_modifier(damage, BURN_MODIFIER);
    }
    damage.max(1)
}

#[cfg(test)]
mod tests {
    use super::{DamageInput, calculate_damage};

    fn neutral_hit() -> DamageInput {
        DamageInput {
            level: 50,
            power: 80,
            attack: 100,
            defense: 100,
            weather_modifier: None,
            critical: false,
            roll: 0,
            same_type_attack_bonus: false,
            type_modifier: 0,
            burned: false,
        }
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
            same_type_attack_bonus: true,
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
