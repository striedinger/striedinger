//! Behavior of abilities and items, and of the end-of-turn ordering they share with statuses.

mod common;

use common::{P1, P2, damage_to, edit, max_hp, movers, play, set, start};
use pkmn::battle::{DamageSource, HealSource};
use pkmn::dex::{Status, WeatherId};
use pkmn::stats::BoostStat;
use pkmn::{Battle, BattleState, Choice, Event, Outcome, PokemonSet, Request};

const MOVE: Choice = Choice::Move(0);

/// Damage P1's first move deals to P2 in the first turn, after `change` edits the state.
fn first_hit(p1: PokemonSet, p2: PokemonSet, change: impl FnOnce(&mut BattleState)) -> u16 {
    let battle = edit(start(&[p1], &[p2], 7), change);
    let mut battle = battle;
    let events = play(&mut battle, MOVE, MOVE);
    damage_to(&events, P2, DamageSource::Move)[0]
}

fn ratio(boosted: u16, plain: u16) -> f64 {
    f64::from(boosted) / f64::from(plain)
}

fn activated(events: &[Event], battle: &Battle, side: pkmn::SideId, name: &str) -> bool {
    events.iter().any(|event| match event {
        Event::Ability {
            side: holder,
            ability,
        } if *holder == side => battle.dex().ability(*ability).name == name,
        Event::Item { side: holder, item } if *holder == side => {
            battle.dex().item(*item).name == name
        }
        _ => false,
    })
}

#[test]
fn pinch_abilities_boost_their_type_only_at_a_third_of_max_hp() {
    let attacker = set("Cindercub", &["Blaze Burst"]).with_ability("Kindling Heart");
    let defender = set("Brawlstag", &["Hunker Down"]);
    let healthy = first_hit(attacker.clone(), defender.clone(), |_| {});
    let pinched = first_hit(attacker, defender, |state| {
        let pokemon = &mut state.sides[0].team[0];
        pokemon.hp = pokemon.max_hp() / 3;
    });
    let boost = ratio(pinched, healthy);
    assert!((1.4..1.6).contains(&boost), "{healthy} -> {pinched}");
}

#[test]
fn type_immunity_traits_block_moves_of_that_type() {
    let mut battle = start(
        &[set("Craghorn", &["Tremor"])],
        &[set("Galewing", &["Hunker Down"]).with_ability("Featherfall")],
        3,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::Immune { side: P2 }));
    assert!(damage_to(&events, P2, DamageSource::Move).is_empty());
}

#[test]
fn absorbing_traits_heal_instead_of_taking_damage() {
    let battle = start(
        &[set("Zaplet", &["Static Jolt", "Volt Snare"])],
        &[set("Tidewhelp", &["Hunker Down"]).with_ability("Stormcatcher")],
        5,
    );
    let mut battle = edit(battle, |state| state.sides[1].team[0].hp = 1);
    let events = play(&mut battle, MOVE, MOVE);
    let quarter = max_hp(&battle, P2) / 4;
    assert!(events.iter().any(|event| matches!(
        event,
        Event::Heal { side: P2, amount, from: HealSource::Effect(_), .. } if *amount == quarter
    )));
    assert!(damage_to(&events, P2, DamageSource::Move).is_empty());
}

#[test]
fn entry_traits_trigger_for_leads_and_switch_ins() {
    let battle = start(
        &[
            set("Brawlstag", &["Pounce"]),
            set("Frostmaw", &["Pounce"]).with_ability("Menace"),
        ],
        &[set("Tidewhelp", &["Pounce"]).with_ability("Cloudburst")],
        9,
    );
    assert_eq!(
        battle.state().field.weather.map(|weather| weather.id),
        Some(WeatherId(0))
    );
    let mut battle = battle;
    let events = play(&mut battle, Choice::Switch(1), MOVE);
    assert!(activated(&events, &battle, P1, "Menace"));
    assert!(events.contains(&Event::Boost {
        side: P2,
        stat: BoostStat::Attack,
        stages: -1
    }));
}

#[test]
fn weather_speed_abilities_reorder_turns() {
    let p1 = set("Craghorn", &["Pounce"]).with_ability("Rain Runner");
    let p2 = set("Bramblehog", &["Pounce"]).with_ability("Cloudburst");
    let mut battle = start(&[p1], &[p2], 11);
    assert_eq!(movers(&play(&mut battle, MOVE, MOVE)), [P1, P2]);
}

#[test]
fn contact_traits_punish_attackers_only_for_contact_moves() {
    let defender = set("Tidewhelp", &["Hunker Down"])
        .with_ability("Barbed Hide")
        .with_item("Spike Guard");
    let mut battle = start(&[set("Brawlstag", &["Pounce", "Tremor"])], &[defender], 13);
    let events = play(&mut battle, MOVE, MOVE);
    let attacker_max = max_hp(&battle, P1);
    let punished: Vec<u16> = events
        .iter()
        .filter_map(|event| match event {
            Event::Damage {
                side: P1,
                amount,
                from: DamageSource::Effect(_),
                ..
            } => Some(*amount),
            _ => None,
        })
        .collect();
    assert_eq!(punished, [attacker_max / 8, attacker_max / 6]);

    let events = play(&mut battle, Choice::Move(1), MOVE);
    assert!(!events.iter().any(|event| matches!(
        event,
        Event::Damage {
            side: P1,
            from: DamageSource::Effect(_),
            ..
        }
    )));
}

#[test]
fn contact_status_traits_eventually_paralyze_attackers() {
    let paralyzed = (0..50).any(|seed| {
        let mut battle = start(
            &[set("Brawlstag", &["Pounce"])],
            &[set("Tidewhelp", &["Hunker Down"]).with_ability("Static Coat")],
            seed,
        );
        let events = play(&mut battle, MOVE, MOVE);
        events.contains(&Event::Status {
            side: P1,
            status: Status::Paralysis,
        })
    });
    assert!(paralyzed);
}

#[test]
fn stab_and_defensive_modifiers_scale_damage() {
    let attacker = || set("Tidewhelp", &["Riptide"]);
    let plain = first_hit(attacker(), set("Cindercub", &["Hunker Down"]), |_| {});
    let doubled = first_hit(
        attacker().with_ability("Purebred"),
        set("Cindercub", &["Hunker Down"]),
        |_| {},
    );
    assert!(
        (1.25..1.42).contains(&ratio(doubled, plain)),
        "{plain} -> {doubled}"
    );

    let shelled = first_hit(
        attacker(),
        set("Cindercub", &["Hunker Down"]).with_ability("Hard Shell"),
        |_| {},
    );
    assert!(
        (0.7..0.8).contains(&ratio(shelled, plain)),
        "{plain} -> {shelled}"
    );
}

#[test]
fn grit_turns_a_burn_into_a_boost() {
    let burned = |state: &mut BattleState| state.sides[0].team[0].status = Some(Status::Burn);
    let defender = || set("Tidewhelp", &["Hunker Down"]);
    let plain = first_hit(set("Brawlstag", &["Pounce"]), defender(), burned);
    let gritty = first_hit(
        set("Brawlstag", &["Pounce"]).with_ability("Grit"),
        defender(),
        burned,
    );
    assert!(
        (2.7..3.3).contains(&ratio(gritty, plain)),
        "{plain} -> {gritty}"
    );
}

#[test]
fn end_of_turn_boosts_skip_the_turn_the_holder_switched_in() {
    let mut battle = start(
        &[
            set("Brawlstag", &["Hunker Down"]),
            set("Zaplet", &["Hunker Down"]).with_ability("Overdrive"),
        ],
        &[set("Tidewhelp", &["Hunker Down"])],
        15,
    );
    let events = play(&mut battle, Choice::Switch(1), MOVE);
    assert!(
        !events
            .iter()
            .any(|event| matches!(event, Event::Boost { side: P1, .. }))
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::Boost {
        side: P1,
        stat: BoostStat::Speed,
        stages: 1
    }));
}

#[test]
fn endure_traits_leave_one_hp_once_and_ribbons_are_used_up() {
    let battle = start(
        &[set("Brawlstag", &["Haymaker"])],
        &[set("Zaplet", &["Hunker Down"]).with_item("Lifeline Ribbon")],
        17,
    );
    let mut battle = battle;
    let events = play(&mut battle, MOVE, MOVE);
    assert_eq!(battle.state().active(P2).hp, 1);
    assert!(
        events
            .iter()
            .any(|event| matches!(event, Event::EndItem { side: P2, .. }))
    );
    assert_eq!(battle.state().active(P2).item, None);
    play(&mut battle, MOVE, MOVE);
    assert_eq!(battle.outcome(), Some(Outcome::Win(P1)));
}

#[test]
fn status_immunity_traits_block_their_status() {
    for seed in 0..20 {
        let mut battle = start(
            &[set("Zaplet", &["Volt Snare"])],
            &[set("Tidewhelp", &["Hunker Down"]).with_ability("Loose Limbs")],
            seed,
        );
        let events = play(&mut battle, MOVE, MOVE);
        assert!(
            !events
                .iter()
                .any(|event| matches!(event, Event::Status { .. }))
        );
    }
}

#[test]
fn leftover_style_items_heal_at_the_end_of_the_turn() {
    let battle = start(
        &[set("Brawlstag", &["Pounce"])],
        &[set("Tidewhelp", &["Hunker Down"]).with_item("Moss Pouch")],
        19,
    );
    let mut battle = edit(battle, |state| state.sides[1].team[0].hp = 100);
    let events = play(&mut battle, MOVE, MOVE);
    let healed = events.iter().rev().find_map(|event| match event {
        Event::Heal {
            side: P2, amount, ..
        } => Some(*amount),
        _ => None,
    });
    assert_eq!(healed, Some(max_hp(&battle, P2) / 16));
}

#[test]
fn life_orb_style_items_trade_hp_for_damage() {
    let defender = || set("Tidewhelp", &["Hunker Down"]);
    let plain = first_hit(set("Brawlstag", &["Pounce"]), defender(), |_| {});
    let charmed = first_hit(
        set("Brawlstag", &["Pounce"]).with_item("Glass Charm"),
        defender(),
        |_| {},
    );
    assert!(
        (1.2..1.4).contains(&ratio(charmed, plain)),
        "{plain} -> {charmed}"
    );

    let mut battle = start(
        &[set("Brawlstag", &["Pounce"]).with_item("Glass Charm")],
        &[defender()],
        7,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.iter().any(|event| matches!(
        event,
        Event::Damage { side: P1, amount, from: DamageSource::Effect(_), .. }
            if *amount == max_hp(&battle, P1) / 10
    )));
}

#[test]
fn choice_items_lock_the_first_move_until_switching_out() {
    let mut battle = start(
        &[
            set("Brawlstag", &["Pounce", "Tremor"]).with_item("Power Band"),
            set("Zaplet", &["Pounce"]),
        ],
        &[set("Tidewhelp", &["Hunker Down"])],
        21,
    );
    play(&mut battle, Choice::Move(1), MOVE);
    let Some(Request::Move { moves, .. }) = battle.request(P1) else {
        panic!("expected a turn request");
    };
    assert_eq!(
        moves
            .iter()
            .map(|option| option.disabled)
            .collect::<Vec<_>>(),
        [true, false]
    );
    assert!(battle.validate(P1, Choice::Move(0)).is_err());

    play(&mut battle, Choice::Switch(1), MOVE);
    play(&mut battle, Choice::Switch(0), MOVE);
    assert!(battle.validate(P1, Choice::Move(0)).is_ok());
}

#[test]
fn type_power_items_boost_their_type() {
    let defender = || set("Brawlstag", &["Hunker Down"]);
    let plain = first_hit(set("Cindercub", &["Ember Snap"]), defender(), |_| {});
    let charmed = first_hit(
        set("Cindercub", &["Ember Snap"]).with_item("Ember Charm"),
        defender(),
        |_| {},
    );
    assert!(
        (1.1..1.3).contains(&ratio(charmed, plain)),
        "{plain} -> {charmed}"
    );
}

#[test]
fn threshold_berries_heal_once_below_half() {
    let mut battle = start(
        &[set("Brawlstag", &["Haymaker"])],
        &[set("Craghorn", &["Hunker Down"]).with_item("Juice Berry")],
        23,
    );
    let events = play(&mut battle, MOVE, MOVE);
    let quarter = max_hp(&battle, P2) / 4;
    assert!(events.iter().any(|event| matches!(
        event,
        Event::Heal { side: P2, amount, from: HealSource::Effect(_), .. } if *amount == quarter
    )));
    assert_eq!(battle.state().active(P2).item, None);
}

#[test]
fn cure_berries_remove_a_status_as_soon_as_it_lands() {
    for seed in 0..30 {
        let mut battle = start(
            &[set("Zaplet", &["Scorch Veil"])],
            &[set("Tidewhelp", &["Hunker Down"]).with_item("Remedy Berry")],
            seed,
        );
        let events = play(&mut battle, MOVE, MOVE);
        if events.contains(&Event::Status {
            side: P2,
            status: Status::Burn,
        }) {
            assert!(events.contains(&Event::CureStatus {
                side: P2,
                status: Status::Burn
            }));
            assert!(damage_to(&events, P2, DamageSource::Status(Status::Burn)).is_empty());
            return;
        }
    }
    panic!("Scorch Veil never landed");
}

#[test]
fn assault_vests_forbid_status_moves() {
    let battle = start(
        &[set("Tidewhelp", &["Hunker Down", "Riptide"]).with_item("Bastion Vest")],
        &[set("Zaplet", &["Pounce"])],
        25,
    );
    assert!(battle.validate(P1, Choice::Move(0)).is_err());
    assert!(battle.validate(P1, Choice::Move(1)).is_ok());
}

#[test]
fn poison_ticks_before_burn_regardless_of_speed() {
    let battle = start(
        &[set("Zaplet", &["Hunker Down"])],
        &[set("Craghorn", &["Hunker Down"])],
        27,
    );
    let battle = edit(battle, |state| {
        state.sides[0].team[0].status = Some(Status::Burn);
        state.sides[1].team[0].status = Some(Status::Poison);
    });
    let mut battle = battle;
    let events = play(&mut battle, MOVE, MOVE);
    let ticks: Vec<_> = events
        .iter()
        .filter_map(|event| match event {
            Event::Damage {
                side,
                from: DamageSource::Status(_),
                ..
            } => Some(*side),
            _ => None,
        })
        .collect();
    assert_eq!(ticks, [P2, P1]);
}

#[test]
fn a_battle_can_end_partway_through_the_end_of_a_turn() {
    let battle = start(
        &[set("Zaplet", &["Hunker Down"])],
        &[set("Craghorn", &["Hunker Down"])],
        29,
    );
    let battle = edit(battle, |state| {
        state.sides[0].team[0].status = Some(Status::Burn);
        state.sides[0].team[0].hp = 1;
        state.sides[1].team[0].status = Some(Status::Poison);
        state.sides[1].team[0].hp = 1;
    });
    let mut battle = battle;
    let events = play(&mut battle, MOVE, MOVE);
    assert_eq!(battle.outcome(), Some(Outcome::Win(P1)));
    assert!(damage_to(&events, P1, DamageSource::Status(Status::Burn)).is_empty());
}

/// The sample pack plus extra moves and items, given as JSON arrays.
fn extended_dex(moves: &str, items: &str) -> std::sync::Arc<pkmn::Dex> {
    let mut source: pkmn::DexSource =
        serde_json::from_str(pkmn::SAMPLE_DEX_JSON).expect("the sample pack parses");
    source
        .moves
        .extend(serde_json::from_str::<Vec<pkmn::dex::MoveSource>>(moves).expect("moves parse"));
    source
        .items
        .extend(serde_json::from_str::<Vec<pkmn::dex::ItemSource>>(items).expect("items parse"));
    std::sync::Arc::new(pkmn::Dex::from_source(&source).expect("the extended pack compiles"))
}

#[test]
fn berries_react_to_weather_damage_before_status_damage() {
    let battle = start(
        &[set("Brawlstag", &["Hunker Down"]).with_item("Juice Berry")],
        &[set("Craghorn", &["Hunker Down"])],
        31,
    );
    let mut battle = edit(battle, |state| {
        let sandstorm = pkmn::dex::WeatherId(2);
        state.field.weather = Some(pkmn::battle::WeatherState {
            id: sandstorm,
            duration: 5,
        });
        let pokemon = &mut state.sides[0].team[0];
        pokemon.hp = pokemon.max_hp() * 55 / 100;
        pokemon.status = Some(Status::Toxic);
        pokemon.status_state.stage = 7;
    });
    let events = play(&mut battle, MOVE, MOVE);
    let berry = events
        .iter()
        .position(|event| matches!(event, Event::EndItem { side: P1, .. }));
    let toxic = events.iter().position(|event| {
        matches!(
            event,
            Event::Damage {
                side: P1,
                from: DamageSource::Status(Status::Toxic),
                ..
            }
        )
    });
    assert!(berry.is_some() && berry < toxic, "{events:?}");
    assert_eq!(battle.outcome(), None);
}

#[test]
fn damaging_moves_apply_their_weather_and_heal() {
    let dex = extended_dex(
        r#"[{"name": "Storm Slash", "type": "Water", "category": "Physical", "basePower": 40,
            "accuracy": true, "pp": 10, "weather": "Rain"}]"#,
        "[]",
    );
    let mut battle = pkmn::Battle::new(
        dex,
        [
            &[set("Tidewhelp", &["Storm Slash"])],
            &[set("Brawlstag", &["Hunker Down"])],
        ],
        33,
    )
    .expect("the teams are valid");
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::Weather {
        weather: Some(WeatherId(0))
    }));
}

#[test]
fn a_consumed_item_stops_reacting_within_the_same_update() {
    let dex = extended_dex(
        "[]",
        r#"[{"name": "Twin Berry", "consumable": true,
            "handlers": [{"healAtThreshold": {"threshold": [1, 2], "amount": [1, 4]}}, "cureStatus"]}]"#,
    );
    let battle = pkmn::Battle::new(
        dex,
        [
            &[set("Brawlstag", &["Hunker Down"]).with_item("Twin Berry")],
            &[set("Craghorn", &["Hunker Down"])],
        ],
        35,
    )
    .expect("the teams are valid");
    let mut battle = edit(battle, |state| {
        let pokemon = &mut state.sides[0].team[0];
        pokemon.hp = pokemon.max_hp() / 3;
        pokemon.status = Some(Status::Burn);
    });
    let events = play(&mut battle, MOVE, MOVE);
    let used_up = events
        .iter()
        .filter(|event| matches!(event, Event::EndItem { .. }))
        .count();
    assert_eq!(used_up, 1);
    assert_eq!(battle.state().active(P1).status, Some(Status::Burn));
}

#[test]
fn fractional_item_heals_restore_at_least_one_hp() {
    let mut low_level = set("Tidewhelp", &["Hunker Down"]).with_item("Moss Pouch");
    low_level.level = 1;
    let battle = start(&[low_level], &[set("Brawlstag", &["Hunker Down"])], 37);
    let mut battle = edit(battle, |state| state.sides[0].team[0].hp = 5);
    assert!(battle.state().active(P1).max_hp() < 16);
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.iter().any(|event| matches!(
        event,
        Event::Heal {
            side: P1,
            amount: 1,
            ..
        }
    )));
}

#[test]
fn restored_states_with_extreme_counters_do_not_overflow() {
    let battle = start(
        &[set("Brawlstag", &["Hunker Down"])],
        &[set("Craghorn", &["Hunker Down"])],
        39,
    );
    let mut battle = edit(battle, |state| {
        state.sides[0].team[0].status = Some(Status::Toxic);
        state.sides[0].team[0].status_state.stage = u8::MAX;
    });
    play(&mut battle, MOVE, MOVE);
    assert_eq!(battle.state().active(P1).status_state.stage, 15);
}
