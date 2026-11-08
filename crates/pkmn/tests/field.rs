//! Behavior of terrain, charging and rampaging moves, forced switches, hazard removal, and
//! Terastallization.

mod common;

use common::{P1, P2, damage_to, edit, max_hp, movers, play, set, start};
use pkmn::battle::{DamageSource, HealSource, TerrainState, WeatherState};
use pkmn::dex::{TerrainId, VolatileStatus};
use pkmn::{Battle, BattleState, Choice, Event, Request};

const MOVE: Choice = Choice::Move(0);

fn terrain(battle: &Battle, name: &str) -> TerrainId {
    battle
        .dex()
        .terrain_id(name)
        .expect("the sample pack has the terrain")
}

fn with_terrain(battle: Battle, name: &str) -> Battle {
    let id = terrain(&battle, name);
    edit(battle, |state: &mut BattleState| {
        state.field.terrain = Some(TerrainState { id, duration: 5 });
    })
}

fn first_hit(battle: Battle) -> u16 {
    let mut battle = battle;
    damage_to(&play(&mut battle, MOVE, MOVE), P2, DamageSource::Move)[0]
}

fn ratio(boosted: u16, plain: u16) -> f64 {
    f64::from(boosted) / f64::from(plain)
}

#[test]
fn terrain_boosts_only_grounded_attackers() {
    let duel = |attacker: &str| {
        start(
            &[set(attacker, &["Static Jolt"])],
            &[set("Brawlstag", &["Hunker Down"])],
            1,
        )
    };
    let plain = first_hit(duel("Zaplet"));
    let charged = first_hit(with_terrain(duel("Zaplet"), "Charged Field"));
    assert!(
        (1.25..1.35).contains(&ratio(charged, plain)),
        "{plain} -> {charged}"
    );

    let flying = first_hit(duel("Galewing"));
    let flying_charged = first_hit(with_terrain(duel("Galewing"), "Charged Field"));
    assert_eq!(flying, flying_charged, "Flying types are not grounded");
}

#[test]
fn terrain_blocks_statuses_and_priority_against_grounded_targets() {
    for seed in 0..20 {
        let battle = start(
            &[set("Zaplet", &["Spore Cloud"])],
            &[set("Brawlstag", &["Hunker Down"])],
            seed,
        );
        let mut battle = with_terrain(battle, "Charged Field");
        let events = play(&mut battle, MOVE, MOVE);
        assert!(
            !events
                .iter()
                .any(|event| matches!(event, Event::Status { .. }))
        );
    }
    let battle = start(
        &[set("Zaplet", &["Swift Strike"])],
        &[set("Brawlstag", &["Hunker Down"])],
        3,
    );
    let mut battle = with_terrain(battle, "Mind Field");
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::Fail { side: P1 }));
    assert_eq!(damage_to(&events, P2, DamageSource::Move), [] as [u16; 0]);
}

#[test]
fn healing_terrain_restores_grounded_creatures_and_every_terrain_fades() {
    let battle = start(
        &[set("Bramblehog", &["Sprout Ground", "Hunker Down"])],
        &[set("Galewing", &["Hunker Down"])],
        5,
    );
    let mut battle = edit(battle, |state: &mut BattleState| {
        state.sides[0].team[0].hp = 100;
        state.sides[1].team[0].hp = 100;
    });
    let events = play(&mut battle, MOVE, MOVE);
    let overgrowth = terrain(&battle, "Overgrowth");
    let heals: Vec<_> = events
        .iter()
        .filter_map(|event| match *event {
            Event::Heal {
                side,
                amount,
                from: HealSource::Terrain(id),
                ..
            } if id == overgrowth => Some((side, amount)),
            _ => None,
        })
        .collect();
    assert_eq!(
        heals,
        [(P1, max_hp(&battle, P1) / 16)],
        "the airborne foe is not healed"
    );
    for turn in 2..=5 {
        let events = play(&mut battle, Choice::Move(1), MOVE);
        let faded = events.contains(&Event::Terrain { terrain: None });
        assert_eq!(faded, turn == 5, "turn {turn}");
    }
}

#[test]
fn entry_abilities_can_set_terrain() {
    let battle = start(
        &[set("Zaplet", &["Hunker Down"]).with_ability("Live Wire")],
        &[set("Brawlstag", &["Hunker Down"])],
        7,
    );
    assert_eq!(
        battle.state().field.terrain.map(|state| state.id),
        Some(terrain(&battle, "Charged Field"))
    );
}

#[test]
fn charge_moves_spend_a_turn_charging_and_lock_the_user_in() {
    let mut battle = start(
        &[
            set("Bramblehog", &["Sunlance", "Pounce"]),
            set("Zaplet", &["Pounce"]),
        ],
        &[set("Brawlstag", &["Hunker Down"])],
        9,
    );
    let pp = |battle: &Battle| battle.state().active(P1).move_slots[0].map(|slot| slot.pp);
    let full = pp(&battle);
    let events = play(&mut battle, MOVE, MOVE);
    assert!(
        events
            .iter()
            .any(|event| matches!(event, Event::Prepare { side: P1, .. }))
    );
    assert_eq!(damage_to(&events, P2, DamageSource::Move), [] as [u16; 0]);
    let Some(Request::Move {
        moves, switches, ..
    }) = battle.request(P1)
    else {
        panic!("expected a move request");
    };
    assert_eq!(
        moves
            .iter()
            .map(|option| option.disabled)
            .collect::<Vec<_>>(),
        [false, true]
    );
    assert!(switches.is_empty(), "a charging creature cannot switch");

    let events = play(&mut battle, MOVE, MOVE);
    assert_ne!(damage_to(&events, P2, DamageSource::Move), [] as [u16; 0]);
    assert_eq!(pp(&battle), full.map(|pp| pp - 1), "PP is spent once");
}

#[test]
fn weather_can_skip_a_charge() {
    let battle = start(
        &[set("Bramblehog", &["Sunlance"])],
        &[set("Brawlstag", &["Hunker Down"])],
        11,
    );
    let sun = battle
        .dex()
        .weather_id("Sun")
        .expect("the sample pack has sun");
    let mut battle = edit(battle, |state: &mut BattleState| {
        state.field.weather = Some(WeatherState {
            id: sun,
            duration: 5,
        });
    });
    let events = play(&mut battle, MOVE, MOVE);
    assert!(
        !events
            .iter()
            .any(|event| matches!(event, Event::Prepare { .. }))
    );
    assert_ne!(damage_to(&events, P2, DamageSource::Move), [] as [u16; 0]);
}

#[test]
fn semi_invulnerable_chargers_dodge_everything() {
    let mut battle = start(
        &[set("Galewing", &["Sky Plunge"])],
        &[set("Craghorn", &["Pounce"])],
        13,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert_eq!(movers(&events), [P1, P2]);
    assert!(events.contains(&Event::Miss { side: P2 }));
}

#[test]
fn rampages_last_two_or_three_turns_then_confuse() {
    let mut lengths = std::collections::BTreeSet::new();
    for seed in 0..40 {
        let mut battle = start(
            &[
                set("Dunewyrm", &["Frenzy Claw", "Tremor"]),
                set("Zaplet", &["Pounce"]),
            ],
            &[set("Ironmantis", &["Hunker Down"])],
            seed,
        );
        let mut turns = 0;
        loop {
            let events = play(&mut battle, MOVE, MOVE);
            turns += 1;
            if events.contains(&Event::Start {
                side: P1,
                volatile: VolatileStatus::Confusion,
            }) {
                break;
            }
            let Some(Request::Move { switches, .. }) = battle.request(P1) else {
                panic!("expected a move request");
            };
            assert!(switches.is_empty(), "a rampaging creature cannot switch");
            assert!(battle.validate(P1, Choice::Move(1)).is_err());
            assert!(turns < 4, "the rampage never ended");
        }
        lengths.insert(turns);
    }
    assert_eq!(lengths.into_iter().collect::<Vec<_>>(), [2, 3]);
}

#[test]
fn roar_style_moves_drag_out_a_random_replacement() {
    let mut dragged = std::collections::BTreeSet::new();
    for seed in 0..30 {
        let mut battle = start(
            &[set("Brawlstag", &["Howl Away"])],
            &[
                set("Tidewhelp", &["Pounce"]),
                set("Zaplet", &["Pounce"]),
                set("Craghorn", &["Pounce"]),
            ],
            seed,
        );
        let events = play(&mut battle, MOVE, MOVE);
        let slot = events.iter().find_map(|event| match *event {
            Event::Switch { side: P2, slot, .. } => Some(slot),
            _ => None,
        });
        dragged.insert(slot.expect("the foe was dragged out"));
    }
    assert_eq!(dragged.into_iter().collect::<Vec<_>>(), [1, 2]);

    let mut battle = start(
        &[set("Brawlstag", &["Howl Away"])],
        &[set("Tidewhelp", &["Pounce"])],
        15,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(
        events.contains(&Event::Fail { side: P1 }),
        "nothing to drag in"
    );
}

#[test]
fn dragging_out_cancels_the_target_s_move() {
    let mut battle = start(
        &[set("Zaplet", &["Tail Toss"])],
        &[
            set("Craghorn", &["Howl Away"]),
            set("Tidewhelp", &["Pounce"]),
        ],
        17,
    );
    for _ in 0..10 {
        let events = play(&mut battle, MOVE, MOVE);
        if events
            .iter()
            .any(|event| matches!(event, Event::Switch { side: P2, .. }))
        {
            // Both moves have priority -6, so the faster Zaplet acts first, and dragging
            // Craghorn out cancels its Howl Away.
            assert_eq!(movers(&events), [P1]);
            return;
        }
    }
    panic!("Tail Toss never landed");
}

#[test]
fn spinning_clears_the_user_s_hazards() {
    let mut battle = start(
        &[
            set("Brawlstag", &["Spin Clear"]),
            set("Zaplet", &["Pounce"]),
        ],
        &[set("Craghorn", &["Scatter Stones", "Hunker Down"])],
        19,
    );
    play(&mut battle, MOVE, MOVE);
    assert_ne!(
        battle.state().side(P1).conditions,
        [] as [pkmn::battle::SideConditionState; 0]
    );
    let events = play(&mut battle, MOVE, Choice::Move(1));
    assert!(
        events
            .iter()
            .any(|event| matches!(event, Event::SideEnd { side: P1, .. }))
    );
    assert_eq!(
        battle.state().side(P1).conditions,
        [] as [pkmn::battle::SideConditionState; 0]
    );
}

#[test]
fn defog_style_moves_clear_both_sides_and_the_terrain() {
    let battle = start(
        &[set("Galewing", &["Clear Gust"])],
        &[set("Tidewhelp", &["Hunker Down"])],
        21,
    );
    let battle = with_terrain(battle, "Mind Field");
    let mut battle = edit(battle, |state: &mut BattleState| {
        for (side, condition) in [(0, 0), (1, 0), (1, 2)] {
            state.sides[side]
                .conditions
                .push(pkmn::battle::SideConditionState {
                    id: pkmn::dex::SideConditionId(condition),
                    layers: 1,
                    duration: (condition == 2).then_some(5),
                });
        }
    });
    let events = play(&mut battle, MOVE, MOVE);
    assert!(
        battle
            .state()
            .sides
            .iter()
            .all(|side| side.conditions.is_empty())
    );
    assert_eq!(battle.state().field.terrain, None);
    assert!(events.contains(&Event::Boost {
        side: P2,
        stat: pkmn::stats::BoostStat::Evasion,
        stages: -1
    }));
}

#[test]
fn terastallizing_changes_types_once_per_battle() {
    let mut cindercub = set("Cindercub", &["Hunker Down"]);
    cindercub.tera_type = Some("Water".to_owned());
    let mut battle = start(
        &[cindercub, set("Zaplet", &["Pounce"])],
        &[set("Tidewhelp", &["Riptide"])],
        23,
    );
    let events = play(&mut battle, Choice::Terastallize(0), MOVE);
    assert_eq!(
        events[0],
        Event::Terastallize {
            side: P1,
            tera_type: battle.dex().type_id("Water").expect("Water exists"),
        }
    );
    assert!(
        events.contains(&Event::Resisted { side: P1 }),
        "Water resists Water now"
    );
    assert!(battle.validate(P1, Choice::Terastallize(0)).is_err());
    play(&mut battle, Choice::Switch(1), MOVE);
    assert!(
        battle.validate(P1, Choice::Terastallize(0)).is_err(),
        "once per side"
    );
}

#[test]
fn terastallizing_into_an_original_type_doubles_stab_and_raises_weak_moves() {
    let duel = || {
        let mut galewing = set("Galewing", &["Pounce"]);
        galewing.tera_type = Some("Normal".to_owned());
        start(&[galewing], &[set("Brawlstag", &["Hunker Down"])], 25)
    };
    let mut plain = duel();
    let plain = damage_to(&play(&mut plain, MOVE, MOVE), P2, DamageSource::Move)[0];
    let mut tera = duel();
    let tera = damage_to(
        &play(&mut tera, Choice::Terastallize(0), MOVE),
        P2,
        DamageSource::Move,
    )[0];
    // 40 → 60 base power, and ×1.5 → ×2 STAB: about ×2 overall.
    assert!(
        (1.9..2.1).contains(&ratio(tera, plain)),
        "{plain} -> {tera}"
    );
}

#[test]
fn adaptability_style_stab_needs_a_current_type() {
    let duel = |tera_type: &str| {
        let mut galewing = set("Galewing", &["Pounce"]);
        galewing.ability = Some("Purebred".to_owned());
        galewing.tera_type = Some(tera_type.to_owned());
        start(&[galewing], &[set("Brawlstag", &["Hunker Down"])], 27)
    };
    let hit = |tera_type: &str, choice: Choice| {
        let mut battle = duel(tera_type);
        damage_to(&play(&mut battle, choice, MOVE), P2, DamageSource::Move)[0]
    };
    let adapted = hit("Water", MOVE);
    // A Water Tera type drops Normal from Galewing's types: ×2 → ×1.5.
    let lost = hit("Water", Choice::Terastallize(0));
    assert!(
        (1.28..1.39).contains(&ratio(adapted, lost)),
        "{adapted} -> {lost}"
    );
    // A Normal Tera type keeps it, and the data's `teraModifier` gives ×2.25. The weak move is
    // also raised from 40 to 60 base power.
    let doubled = hit("Normal", Choice::Terastallize(0));
    assert!(
        (1.6..1.8).contains(&ratio(doubled, adapted)),
        "{adapted} -> {doubled}"
    );
}

#[test]
fn switches_happen_before_terastallization() {
    let mut cindercub = set("Cindercub", &["Hunker Down"]);
    cindercub.tera_type = Some("Water".to_owned());
    let mut battle = start(
        &[cindercub],
        &[set("Tidewhelp", &["Riptide"]), set("Zaplet", &["Pounce"])],
        29,
    );
    let events = play(&mut battle, Choice::Terastallize(0), Choice::Switch(1));
    assert!(matches!(events[0], Event::Switch { side: P2, .. }));
    assert!(matches!(events[1], Event::Terastallize { side: P1, .. }));
}
