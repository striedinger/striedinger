//! Stats, speed, and damage with ability and item modifiers, chained in 4096 fixed point like
//! Showdown's `chainModify`. Each lookup first checks the holder's handler mask, so creatures
//! without a relevant handler skip the work entirely.

use super::Engine;
use crate::battle::damage::{
    DAMAGE_ROLLS, DamageInput, FREE_FOR_ALL_SPREAD_MODIFIER, SPREAD_MODIFIER, STAB_MODIFIER,
    calculate_damage,
};
use crate::battle::state::{GameType, Pokemon, Position, TeraType};
use crate::dex::{
    Condition, Grounded, Handler, HandlerMask, ItemEffect, MoveCategory, MoveData, Status,
    TerrainData,
};
use crate::stats::{BoostStat, MODIFIER_SCALE, Stat, apply_modifier, apply_stage, chain_modifiers};

/// Speed is capped here before ordering.
const MAX_SPEED: u32 = 10_000;
/// Action order compares speed in 13 bits, as Showdown's `getActionSpeed` does.
const ACTION_SPEED_BITS: u32 = 13;
/// A Terastallized user's weak Tera-type moves are raised to this base power.
const TERA_MINIMUM_POWER: u32 = 60;
/// STAB when the Tera type matches one of the user's original types: ×2.
const TERA_STAB_MODIFIER: u32 = MODIFIER_SCALE * 2;
/// A Stellar Terastallization's boost to a move without STAB: ×4915/4096.
const STELLAR_MODIFIER: u32 = 4915;
/// At most this many screens can be up: each side's of each category.
const MAX_SCREENS: usize = 8;
/// Base power of a confusion self-hit.
const CONFUSION_POWER: u16 = 40;

/// What a modifier condition is evaluated against.
#[derive(Clone, Copy)]
struct Context<'m> {
    move_data: Option<&'m MoveData>,
    type_modifier: i8,
}

impl Context<'_> {
    const NO_MOVE: Self = Context {
        move_data: None,
        type_modifier: 0,
    };
}

impl Engine<'_> {
    fn condition_holds(
        &self,
        condition: Condition,
        holder: &Pokemon,
        context: Context<'_>,
    ) -> bool {
        match condition {
            Condition::MoveType(type_id) => context
                .move_data
                .is_some_and(|data| data.move_type == Some(type_id)),
            Condition::Category(category) => context
                .move_data
                .is_some_and(|data| data.category == category),
            Condition::HpAtMost(fraction) => fraction.covers(holder.hp, holder.max_hp()),
            Condition::FullHp => holder.hp == holder.max_hp(),
            Condition::Statused => holder.status.is_some(),
            Condition::Weather(weather) => self.weather_id() == Some(weather),
            Condition::SuperEffective => context.type_modifier > 0,
        }
    }

    /// Chains every modifier `select` picks from the holder's handlers, skipping the walk
    /// entirely when the holder has no handler of `kind`.
    fn chained(
        &self,
        side: Position,
        kind: HandlerMask,
        context: Context<'_>,
        select: impl Fn(&Handler) -> Option<(u32, &[Condition])>,
    ) -> u32 {
        if !self.mask(side).intersects(kind) {
            return MODIFIER_SCALE;
        }
        let holder = self.active(side);
        chain_modifiers(self.handlers(side).filter_map(|(_, handler)| {
            let (modifier, conditions) = select(handler)?;
            conditions
                .iter()
                .all(|&condition| self.condition_holds(condition, holder, context))
                .then_some(modifier)
        }))
    }

    /// A stat after its stage, any weather boost (applied first, as Showdown's sandstorm and
    /// snow handlers are), and `modifyStat` handlers.
    fn modified_stat(&self, side: Position, stat: Stat, stage: i8, context: Context<'_>) -> u32 {
        let pokemon = self.active(side);
        let mut value = apply_stage(pokemon.stats.get(stat), stage);
        if matches!(stat, Stat::Defense | Stat::SpecialDefense)
            && let Some(weather) = self.weather()
        {
            for boost in &weather.defense_boosts {
                if boost.stat == stat && pokemon.has_type(boost.type_id) {
                    value = apply_modifier(value, boost.modifier);
                }
            }
        }
        let kind = if stat == Stat::Speed {
            HandlerMask::MODIFY_SPEED
        } else {
            HandlerMask::MODIFY_STAT
        };
        let modifier = self.chained(side, kind, context, |handler| match handler {
            Handler::ModifyStat {
                stat: modified,
                modifier,
                conditions,
            } if *modified == stat => Some((*modifier, conditions.as_slice())),
            _ => None,
        });
        apply_modifier(value, modifier)
    }

    /// Showdown's `getActionSpeed`: the speed used to order actions and end-of-turn effects.
    pub(super) fn action_speed(&self, side: Position) -> u32 {
        let pokemon = self.active(side);
        // A fainted creature is no longer active, so Showdown gathers none of its handlers:
        // its queued action sorts at its bare stat, without status, ability, or item.
        let speed = if pokemon.is_fainted() {
            u32::from(pokemon.stats.speed)
        } else {
            let stage = pokemon.boosts.get(BoostStat::Speed);
            let speed = self.modified_stat(side, Stat::Speed, stage, Context::NO_MOVE);
            if pokemon.status == Some(Status::Paralysis) {
                speed / 2
            } else {
                speed
            }
        }
        .min(MAX_SPEED);
        // Trick Room: Showdown's `getActionSpeed` takes 10000 minus speed, then keeps 13 bits.
        let speed = if self.speed_reversed() {
            MAX_SPEED - speed
        } else {
            speed
        };
        speed % (1 << ACTION_SPEED_BITS)
    }

    /// A move's priority after the user's `ModifyPriority` handlers, like Prankster's, and
    /// whether one marked it `pranksterBoosted`. A fainted creature has no handlers.
    pub(super) fn move_priority(&self, side: Position, move_data: &MoveData) -> (i8, bool) {
        let mut priority = move_data.priority;
        let mut prankster = false;
        let holder = self.active(side);
        if self.mask(side).intersects(HandlerMask::MODIFY_PRIORITY) && !holder.is_fainted() {
            let context = Context {
                move_data: Some(move_data),
                type_modifier: 0,
            };
            for (_, handler) in self.handlers(side) {
                if let Handler::ModifyPriority {
                    amount,
                    conditions,
                    prankster: marks,
                } = handler
                    && conditions
                        .iter()
                        .all(|&condition| self.condition_holds(condition, holder, context))
                {
                    priority = priority.saturating_add(*amount);
                    prankster |= *marks;
                }
            }
        }
        (priority, prankster)
    }

    pub(super) fn type_modifier(&self, move_data: &MoveData, target: Position) -> Option<i8> {
        match move_data.move_type {
            Some(move_type) => self
                .dex
                .type_modifier(move_type, self.active(target).types()),
            None => Some(0),
        }
    }

    /// Rolls and returns the damage of one hit.
    pub(super) fn move_damage(
        &mut self,
        side: Position,
        target: Position,
        move_data: &MoveData,
        critical: bool,
        type_modifier: i8,
        spread: bool,
    ) -> u32 {
        let input = DamageInput {
            spread: spread.then_some(if self.state.game_type == GameType::FreeForAll {
                FREE_FOR_ALL_SPREAD_MODIFIER
            } else {
                SPREAD_MODIFIER
            }),
            ..self.damage_input(side, target, move_data, critical, type_modifier)
        };
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        // Showdown's `ModifyDamage` event then sorts every screen's `onAnyModifyDamage`
        // handler. Side conditions have no speed, so two or more tie and are shuffled, though
        // only the defender's screen of the move's category can apply.
        let screens = self
            .state
            .sides
            .iter()
            .flat_map(|team| &team.conditions)
            .filter(|condition| self.dex.side_condition(condition.id).screen.is_some())
            .count();
        let mut order = [(); MAX_SCREENS];
        self.shuffle(&mut order[..screens.min(MAX_SCREENS)]);
        // A Stellar boost is spent on the move's type, but lasts for every hit of this use.
        let attacker = self.active(side);
        if attacker.terastallized
            && attacker.tera_type == TeraType::Stellar
            && let Some(move_type) = move_data.move_type
            && (self.stellar_boosted || !attacker.is_stellar_boosted(move_type))
        {
            self.stellar_boosted = true;
            self.active_mut(side).mark_stellar_boosted(move_type);
        }
        calculate_damage(&DamageInput { roll, ..input })
    }

    /// Showdown's `getDamage` and `modifyDamage`, short of the random roll.
    fn damage_input(
        &self,
        side: Position,
        target: Position,
        move_data: &MoveData,
        critical: bool,
        type_modifier: i8,
    ) -> DamageInput {
        let (attack_stat, attack_boost, defense_stat, defense_boost) = match move_data.category {
            MoveCategory::Special => (
                Stat::SpecialAttack,
                BoostStat::SpecialAttack,
                Stat::SpecialDefense,
                BoostStat::SpecialDefense,
            ),
            MoveCategory::Physical | MoveCategory::Status => (
                Stat::Attack,
                BoostStat::Attack,
                Stat::Defense,
                BoostStat::Defense,
            ),
        };
        let attacker = self.active(side);
        let defender = self.active(target);
        let mut attack_stage = attacker.boosts.get(attack_boost);
        let mut defense_stage = defender.boosts.get(defense_boost);
        if critical {
            attack_stage = attack_stage.max(0);
            defense_stage = defense_stage.min(0);
        }
        let context = Context {
            move_data: Some(move_data),
            type_modifier,
        };
        let base_power_modifier =
            self.chained(
                side,
                HandlerMask::BASE_POWER,
                context,
                |handler| match handler {
                    Handler::BasePower {
                        modifier,
                        conditions,
                    } => Some((*modifier, conditions.as_slice())),
                    _ => None,
                },
            );
        // Helping Hand (`onBasePowerPriority: 10`) comes after item and ability handlers and
        // before terrain (6): ×1.5, or ×2.25 for two.
        let helping_hand = match attacker.volatiles.helping_hand {
            0 => MODIFIER_SCALE,
            1 => MODIFIER_SCALE * 3 / 2,
            _ => MODIFIER_SCALE * 9 / 4,
        };
        // Knock Off's own `onBasePower` has priority 0, after terrain (6).
        let knock_off = if move_data.item_effect == Some(ItemEffect::KnockOff)
            && self.active(target).item.is_some()
        {
            MODIFIER_SCALE * 3 / 2
        } else {
            MODIFIER_SCALE
        };
        let base_power_modifier = chain_modifiers([
            base_power_modifier,
            helping_hand,
            self.terrain_base_power_modifier(side, target, move_data),
            knock_off,
        ]);
        let mut base_power =
            apply_modifier(u32::from(move_data.base_power), base_power_modifier).max(1);
        // Showdown raises weak moves of a Terastallized user's Tera type to 60 power, after
        // every other base power modifier; after a Stellar Terastallization, moves of each type
        // not yet boosted.
        let tera_floor = attacker.terastallized
            && match attacker.tera_type {
                TeraType::Type(tera_type) => move_data.move_type == Some(tera_type),
                TeraType::Stellar => move_data
                    .move_type
                    .is_none_or(|move_type| !attacker.is_stellar_boosted(move_type)),
            };
        if tera_floor
            && base_power < TERA_MINIMUM_POWER
            && move_data.priority <= 0
            && move_data.multihit.max == 1
        {
            base_power = TERA_MINIMUM_POWER;
        }
        let ignores_burn = self.mask(side).intersects(HandlerMask::ATTACK_RULES)
            && self
                .handlers(side)
                .any(|(_, handler)| *handler == Handler::IgnoreBurnPenalty);
        DamageInput {
            level: attacker.level,
            power: u16::try_from(base_power).unwrap_or(u16::MAX),
            attack: self.modified_stat(side, attack_stat, attack_stage, context),
            defense: self.modified_stat(target, defense_stat, defense_stage, context),
            spread: None,
            weather_modifier: self.weather().and_then(|weather| {
                weather
                    .damage_modifiers
                    .iter()
                    .find(|(type_id, _)| Some(*type_id) == move_data.move_type)
                    .map(|&(_, modifier)| modifier)
            }),
            critical,
            roll: 0,
            stab_modifier: self.stab_modifier(side, move_data),
            type_modifier,
            burned: move_data.category == MoveCategory::Physical
                && attacker.status == Some(Status::Burn)
                && !ignores_burn,
            final_modifier: self.final_damage_modifier(side, target, context, critical),
        }
    }

    /// The same-type attack bonus, or a `modifySTAB` handler's replacement for it.
    fn stab_modifier(&self, side: Position, move_data: &MoveData) -> u32 {
        let attacker = self.active(side);
        let Some(move_type) = move_data.move_type else {
            return MODIFIER_SCALE;
        };
        let original = attacker.has_original_type(move_type);
        // Showdown's Stellar rule: the first move of each type is boosted, every hit of it, and
        // no `modifySTAB` handler applies.
        if attacker.terastallized && attacker.tera_type == TeraType::Stellar {
            let boosted = self.stellar_boosted || !attacker.is_stellar_boosted(move_type);
            return match (boosted, original) {
                (true, true) => TERA_STAB_MODIFIER,
                (true, false) => STELLAR_MODIFIER,
                (false, true) => STAB_MODIFIER,
                (false, false) => MODIFIER_SCALE,
            };
        }
        let tera = attacker.terastallized && attacker.tera_type == TeraType::Type(move_type);
        let stab = match (original, tera) {
            (false, false) => return MODIFIER_SCALE,
            (true, true) => TERA_STAB_MODIFIER,
            _ => STAB_MODIFIER,
        };
        // Like Showdown's Adaptability, the replacement needs the move to match a current type,
        // so a Terastallized user's original-type moves keep ×1.5.
        if !self.mask(side).intersects(HandlerMask::ATTACK_RULES) || !attacker.has_type(move_type) {
            return stab;
        }
        self.handlers(side)
            .find_map(|(_, handler)| match *handler {
                Handler::ModifyStab {
                    modifier,
                    tera_modifier,
                } => Some(if stab == TERA_STAB_MODIFIER {
                    tera_modifier
                } else {
                    modifier
                }),
                _ => None,
            })
            .unwrap_or(stab)
    }

    /// Terrain's base power modifiers: one for the attacker's move type if the attacker is
    /// grounded, and one against a grounded target.
    fn terrain_base_power_modifier(
        &self,
        side: Position,
        target: Position,
        move_data: &MoveData,
    ) -> u32 {
        let Some(move_type) = move_data.move_type else {
            return MODIFIER_SCALE;
        };
        let find = |modifiers: &[(crate::dex::TypeId, u32)]| {
            modifiers
                .iter()
                .find(|(type_id, _)| *type_id == move_type)
                .map(|&(_, modifier)| modifier)
        };
        let attacker = self
            .terrain_affecting(side, |terrain| {
                find(&terrain.base_power_modifiers).is_some()
            })
            .and_then(|terrain| find(&terrain.base_power_modifiers));
        let defender = self
            .terrain_affecting(target, |terrain| {
                find(&terrain.target_base_power_modifiers).is_some()
            })
            .and_then(|terrain| find(&terrain.target_base_power_modifiers));
        let for_move = |grounded: Grounded| {
            let holder = match grounded {
                Grounded::User => side,
                Grounded::Target => target,
            };
            let entry = |terrain: &TerrainData| {
                terrain
                    .move_base_power_modifiers
                    .iter()
                    .find(|&&(id, _, needs)| id == move_data.id && needs == grounded)
                    .map(|&(_, modifier, _)| modifier)
            };
            self.terrain_affecting(holder, |terrain| entry(terrain).is_some())
                .and_then(entry)
        };
        chain_modifiers(
            attacker
                .into_iter()
                .chain(defender)
                .chain(for_move(Grounded::User))
                .chain(for_move(Grounded::Target)),
        )
    }

    /// Showdown's `ModifyDamage` chain: the attacker's `modifyDamage` handlers, the
    /// defender's `sourceModifyDamage` handlers, then screens on the defender's side, which
    /// critical hits ignore.
    fn final_damage_modifier(
        &self,
        side: Position,
        target: Position,
        context: Context<'_>,
        critical: bool,
    ) -> u32 {
        let dealt = self.chained(
            side,
            HandlerMask::MODIFY_DAMAGE,
            context,
            |handler| match handler {
                Handler::ModifyDamage {
                    modifier,
                    conditions,
                } => Some((*modifier, conditions.as_slice())),
                _ => None,
            },
        );
        let taken = self.chained(
            target,
            HandlerMask::SOURCE_MODIFY_DAMAGE,
            context,
            |handler| match handler {
                Handler::SourceModifyDamage {
                    modifier,
                    conditions,
                } => Some((*modifier, conditions.as_slice())),
                _ => None,
            },
        );
        let category = context.move_data.map(|data| data.category);
        let screens = self
            .state
            .side(target.side)
            .conditions
            .iter()
            .filter_map(|condition| self.dex.side_condition(condition.id).screen)
            .filter(|screen| !critical && Some(screen.category) == category)
            .map(|screen| {
                if self.state.game_type.active_per_half() > 1 {
                    screen.doubles_modifier
                } else {
                    screen.modifier
                }
            });
        chain_modifiers([dealt, taken].into_iter().chain(screens))
    }

    /// Showdown's `getConfusionDamage`: a 40-power typeless hit that ignores every modifier
    /// but stat stages.
    pub(super) fn confusion_damage(&mut self, side: Position) -> u32 {
        let pokemon = self.active(side);
        let input = DamageInput::neutral(
            pokemon.level,
            CONFUSION_POWER,
            apply_stage(pokemon.stats.attack, pokemon.boosts.attack),
            apply_stage(pokemon.stats.defense, pokemon.boosts.defense),
        );
        let roll = self.state.prng.below(DAMAGE_ROLLS);
        calculate_damage(&DamageInput { roll, ..input })
    }
}
