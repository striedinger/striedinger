//! Behavior of Protect, Substitute, entry hazards, screens, and mid-turn switching.

mod common;

use common::{P1, P1A, P2, P2A, damage_to, edit, max_hp, movers, play, set, start};
use pkmn::battle::DamageSource;
use pkmn::dex::{SideConditionId, VolatileStatus};
use pkmn::{Battle, BattleState, Choice, Event, Request};

const MOVE: Choice = Choice::Move(0);

fn condition(battle: &Battle, name: &str) -> SideConditionId {
    battle
        .dex()
        .side_condition_id(name)
        .expect("the sample pack has the condition")
}

fn hazard_damage(events: &[Event], side: pkmn::SideId) -> Vec<u16> {
    events
        .iter()
        .filter_map(|event| match *event {
            Event::Damage {
                pokemon: hurt,
                amount,
                from: DamageSource::Hazard(_),
                ..
            } if hurt.side == side => Some(amount),
            _ => None,
        })
        .collect()
}

#[test]
fn protect_blocks_moves_aimed_at_the_user() {
    let mut battle = start(
        &[set("Craghorn", &["Brace Wall"])],
        &[set("Zaplet", &["Pounce"])],
        1,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert_eq!(
        movers(&events),
        [P1, P2],
        "Protect's priority puts it first"
    );
    assert!(events.contains(&Event::Activate {
        pokemon: P1A,
        volatile: VolatileStatus::Protect
    }));
    assert!(damage_to(&events, P1, DamageSource::Move).is_empty());
}

#[test]
fn protect_fails_when_the_user_moves_last() {
    let mut battle = start(
        &[set("Zaplet", &["Brace Wall"])],
        &[set("Craghorn", &["Brace Wall"])],
        3,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::Start {
        pokemon: P1A,
        volatile: VolatileStatus::Protect
    }));
    assert!(events.contains(&Event::Fail { pokemon: P2A }));
}

#[test]
fn consecutive_protects_succeed_only_sometimes() {
    let (mut successes, mut failures) = (0, 0);
    for seed in 0..60 {
        let mut battle = start(
            &[set("Craghorn", &["Brace Wall"])],
            &[set("Tidewhelp", &["Hunker Down"])],
            seed,
        );
        let first = play(&mut battle, MOVE, MOVE);
        assert!(
            !first.contains(&Event::Fail { pokemon: P1A }),
            "a first Protect always works"
        );
        let second = play(&mut battle, MOVE, MOVE);
        if second.contains(&Event::Fail { pokemon: P1A }) {
            failures += 1;
        } else {
            successes += 1;
        }
    }
    assert!(
        successes > 0 && failures > successes,
        "{successes} successes, {failures} failures"
    );
}

#[test]
fn protect_does_not_stop_entry_hazards() {
    let mut battle = start(
        &[set("Craghorn", &["Brace Wall"])],
        &[set("Zaplet", &["Scatter Stones"])],
        5,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::SideStart {
        side: P1,
        condition: condition(&battle, "Jagged Stones"),
    }));
}

#[test]
fn substitutes_cost_a_quarter_and_absorb_hits() {
    let mut battle = start(
        &[set("Tidewhelp", &["Stand-In"])],
        &[set("Zaplet", &["Pounce", "Volt Snare"])],
        7,
    );
    let quarter = max_hp(&battle, P1) / 4;
    let events = play(&mut battle, MOVE, Choice::Move(1));
    let paid = events.iter().find_map(|event| match *event {
        Event::Damage {
            pokemon: P1A,
            amount,
            from: DamageSource::Substitute,
            ..
        } => Some(amount),
        _ => None,
    });
    // Zaplet moves first, so its Volt Snare lands before the substitute goes up.
    assert_eq!(paid, Some(quarter));
    assert_eq!(
        battle.state().active(P1).volatiles.substitute,
        Some(quarter)
    );

    let hp_before = battle.state().active(P1).hp;
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.iter().any(|event| matches!(
        event,
        Event::Activate {
            pokemon: P1A,
            volatile: VolatileStatus::Substitute
        }
    )));
    assert_eq!(
        battle.state().active(P1).hp,
        hp_before,
        "the substitute took the hit"
    );
}

#[test]
fn status_moves_fail_against_a_substitute() {
    let battle = start(
        &[set("Tidewhelp", &["Hunker Down"])],
        &[set("Craghorn", &["Spore Cloud"])],
        9,
    );
    let mut battle = edit(battle, |state: &mut BattleState| {
        state.sides[0].team[0].volatiles.substitute = Some(10);
    });
    for _ in 0..5 {
        let events = play(&mut battle, MOVE, MOVE);
        assert!(
            !events
                .iter()
                .any(|event| matches!(event, Event::Status { pokemon: P1A, .. }))
        );
    }
}

#[test]
fn hits_that_break_a_substitute_stop_there() {
    let battle = start(
        &[set("Tidewhelp", &["Hunker Down"])],
        &[set("Brawlstag", &["Haymaker"])],
        11,
    );
    let mut battle = edit(battle, |state: &mut BattleState| {
        state.sides[0].team[0].volatiles.substitute = Some(1);
    });
    let full = max_hp(&battle, P1);
    let events = play(&mut battle, MOVE, MOVE);
    assert!(events.contains(&Event::End {
        pokemon: P1A,
        volatile: VolatileStatus::Substitute
    }));
    assert_eq!(battle.state().active(P1).hp, full);
    assert_eq!(battle.state().active(P1).volatiles.substitute, None);
}

#[test]
fn stealth_rock_style_hazards_scale_with_type_effectiveness() {
    let mut battle = start(
        &[set("Zaplet", &["Scatter Stones"])],
        &[
            set("Brawlstag", &["Hunker Down"]),
            set("Cindercub", &["Hunker Down"]),
        ],
        13,
    );
    play(&mut battle, MOVE, MOVE);
    let events = play(&mut battle, MOVE, Choice::Switch(1));
    let cindercub = &battle.state().side(P2).team[1];
    assert_eq!(
        hazard_damage(&events, P2),
        [cindercub.max_hp() / 4],
        "Rock is super effective on Fire"
    );
}

#[test]
fn spikes_style_hazards_stack_to_three_layers_and_skip_flying_types() {
    let mut battle = start(
        &[set("Zaplet", &["Sow Caltrops"])],
        &[
            set("Brawlstag", &["Hunker Down"]),
            set("Tidewhelp", &["Hunker Down"]),
            set("Galewing", &["Hunker Down"]),
        ],
        15,
    );
    for _ in 0..3 {
        let events = play(&mut battle, MOVE, MOVE);
        assert!(
            events
                .iter()
                .any(|event| matches!(event, Event::SideStart { side: P2, .. }))
        );
    }
    let events = play(&mut battle, MOVE, MOVE);
    assert!(
        events.contains(&Event::Fail { pokemon: P1A }),
        "a fourth layer fails"
    );

    let events = play(&mut battle, MOVE, Choice::Switch(1));
    let tidewhelp = &battle.state().side(P2).team[1];
    assert_eq!(hazard_damage(&events, P2), [tidewhelp.max_hp() / 4]);
    let events = play(&mut battle, MOVE, Choice::Switch(2));
    assert!(
        hazard_damage(&events, P2).is_empty(),
        "Flying types are not grounded"
    );
}

#[test]
fn screens_halve_one_category_and_wear_off_after_five_turns() {
    // Returns the damage of one physical hit and whether it was critical.
    let physical = |screen: bool, seed: u64| {
        let battle = start(
            &[set("Brawlstag", &["Pounce"])],
            &[set("Tidewhelp", &["Hunker Down"])],
            seed,
        );
        let mut battle = edit(battle, |state: &mut BattleState| {
            if screen {
                state.sides[1]
                    .conditions
                    .push(pkmn::battle::SideConditionState {
                        id: SideConditionId(2),
                        layers: 1,
                        duration: Some(5),
                    });
            }
        });
        let events = play(&mut battle, MOVE, MOVE);
        let critical = events.contains(&Event::Crit { pokemon: P2A });
        (damage_to(&events, P2, DamageSource::Move)[0], critical)
    };
    let mut checked_crit = false;
    let mut checked_normal = false;
    for seed in 0..100 {
        let (plain, critical) = physical(false, seed);
        let (screened, _) = physical(true, seed);
        if critical {
            assert_eq!(screened, plain, "critical hits ignore screens");
            checked_crit = true;
        } else {
            assert!(screened.abs_diff(plain / 2) <= 1, "{plain} -> {screened}");
            checked_normal = true;
        }
    }
    assert!(checked_crit && checked_normal);

    let mut battle = start(
        &[set("Tidewhelp", &["Raise Mirror Wall", "Hunker Down"])],
        &[set("Craghorn", &["Hunker Down"])],
        19,
    );
    let wall = condition(&battle, "Mirror Wall");
    play(&mut battle, MOVE, MOVE);
    for turn in 2..=5 {
        let events = play(&mut battle, Choice::Move(1), MOVE);
        let ended = events.contains(&Event::SideEnd {
            side: P1,
            condition: wall,
        });
        assert_eq!(ended, turn == 5, "turn {turn}");
    }
}

#[test]
fn self_switching_moves_pause_the_turn_for_a_replacement() {
    let mut battle = start(
        &[
            set("Zaplet", &["Flit Strike"]),
            set("Craghorn", &["Hunker Down"]),
        ],
        &[set("Tidewhelp", &["Pounce"])],
        21,
    );
    let events = play(&mut battle, MOVE, MOVE);
    assert_eq!(
        movers(&events),
        [P1],
        "Tidewhelp's move waits for the switch"
    );
    assert_eq!(
        battle.request(P1),
        Some(Request::ForceSwitch { switches: vec![1] })
    );
    assert_eq!(battle.request(P2), Some(Request::Wait));

    let events = play(&mut battle, Choice::Switch(1), Choice::Pass);
    assert!(matches!(
        events[0],
        Event::Switch {
            pokemon: P1A,
            slot: 1,
            ..
        }
    ));
    assert_eq!(movers(&events), [P2], "the paused turn resumes");
    assert!(
        !damage_to(&events, P1, DamageSource::Move).is_empty(),
        "the replacement takes the hit"
    );
    assert_eq!(events.last(), Some(&Event::Turn { turn: 2 }));
}

#[test]
fn a_battle_paused_mid_turn_resumes_from_its_saved_state() {
    let mut original = start(
        &[
            set("Zaplet", &["Flit Strike"]),
            set("Craghorn", &["Tremor"]),
        ],
        &[set("Tidewhelp", &["Pounce"])],
        23,
    );
    play(&mut original, MOVE, MOVE);
    let saved = serde_json::to_string(original.state()).expect("the state serializes");
    let state: BattleState = serde_json::from_str(&saved).expect("the state deserializes");
    let mut restored = Battle::from_state(common::dex(), state).expect("the state is valid");
    let a = play(&mut original, Choice::Switch(1), Choice::Pass);
    let b = play(&mut restored, Choice::Switch(1), Choice::Pass);
    assert_eq!(a, b);
    assert_eq!(original.state(), restored.state());
}

#[test]
fn self_switching_moves_do_not_switch_without_a_replacement_or_a_hit() {
    let mut battle = start(
        &[set("Zaplet", &["Flit Strike"])],
        &[set("Tidewhelp", &["Pounce"])],
        25,
    );
    play(&mut battle, MOVE, MOVE);
    assert!(matches!(battle.request(P1), Some(Request::Move { .. })));

    let mut battle = start(
        &[
            set("Zaplet", &["Flit Strike"]),
            set("Craghorn", &["Tremor"]),
        ],
        &[set("Tidewhelp", &["Brace Wall"])],
        27,
    );
    play(&mut battle, MOVE, MOVE);
    assert!(
        matches!(battle.request(P1), Some(Request::Move { .. })),
        "Protect stopped it"
    );
}
