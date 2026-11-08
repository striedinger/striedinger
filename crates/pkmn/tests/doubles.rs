//! Behavior of doubles battles: positions, targets, spread moves, and switching.

use std::sync::Arc;

use pkmn::battle::{ChoiceErrorReason, DamageSource, Request};
use pkmn::{Battle, Choice, Dex, Event, PokemonSet, Position, SideId};

const P1A: Position = Position::new(SideId::P1, 0);
const P1B: Position = Position::new(SideId::P1, 1);
const P2A: Position = Position::new(SideId::P2, 0);
const P2B: Position = Position::new(SideId::P2, 1);

fn dex() -> Arc<Dex> {
    Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"))
}

fn set(species: &str, moves: &[&str]) -> PokemonSet {
    PokemonSet::new(species, moves)
}

fn doubles(p1: &[PokemonSet], p2: &[PokemonSet], seed: u64) -> Battle {
    Battle::doubles(dex(), [p1, p2], seed).expect("the teams are valid")
}

fn damage(events: &[Event], target: Position) -> Vec<u16> {
    events
        .iter()
        .filter_map(|event| match *event {
            Event::Damage {
                pokemon,
                amount,
                from: DamageSource::Move,
                ..
            } if pokemon == target => Some(amount),
            _ => None,
        })
        .collect()
}

#[test]
fn doubles_send_out_two_creatures_a_side_and_ask_each_position() {
    let team = [
        set("Brawlstag", &["Pounce"]),
        set("Tidewhelp", &["Hunker Down"]),
        set("Zaplet", &["Pounce"]),
    ];
    let battle = doubles(&team, &team, 1);
    let switched: Vec<Position> = battle
        .events()
        .iter()
        .filter_map(|event| match *event {
            Event::Switch { pokemon, .. } => Some(pokemon),
            _ => None,
        })
        .collect();
    assert_eq!(switched, [P1A, P1B, P2A, P2B]);
    let Some(Request::Move { switches, .. }) = battle.request(P1B) else {
        panic!("a move request");
    };
    assert_eq!(switches, [2], "only the bench can switch in");
}

#[test]
fn single_target_moves_name_a_target_location() {
    let team = [
        set("Brawlstag", &["Pounce", "Hunker Down"]),
        set("Tidewhelp", &["Hunker Down"]),
    ];
    let battle = doubles(&team, &team, 3);
    let choices: Vec<Choice> = battle.choices(P1A).collect();
    // Pounce at either foe or the ally; Hunker Down at itself.
    for choice in [
        Choice::MoveAt(0, 1),
        Choice::MoveAt(0, 2),
        Choice::MoveAt(0, -2),
        Choice::Move(1),
    ] {
        assert!(choices.contains(&choice), "{choice:?} in {choices:?}");
    }
    assert!(!choices.contains(&Choice::MoveAt(0, -1)), "not itself");
    assert_eq!(
        battle.validate(P1A, Choice::Move(0)).unwrap_err().reason,
        ChoiceErrorReason::InvalidTarget
    );
    assert_eq!(
        battle
            .validate(P1A, Choice::MoveAt(1, 1))
            .unwrap_err()
            .reason,
        ChoiceErrorReason::InvalidTarget,
        "Hunker Down takes no target"
    );
}

#[test]
fn a_side_cannot_send_one_creature_into_two_positions() {
    let team = [
        set("Brawlstag", &["Hunker Down"]),
        set("Tidewhelp", &["Hunker Down"]),
        set("Zaplet", &["Hunker Down"]),
    ];
    let mut battle = doubles(&team, &team, 5);
    let error = battle
        .submit_doubles([
            [Choice::Switch(2), Choice::Switch(2)],
            [Choice::Move(0), Choice::Move(0)],
        ])
        .unwrap_err();
    assert_eq!(error.reason, ChoiceErrorReason::InvalidSwitch);
    assert_eq!(error.position, P1B);
}

#[test]
fn spread_moves_hit_every_foe_for_three_quarters() {
    // Rockfall hits all foes; aimed at one foe, a single-target move of the same power is
    // compared against it with the same seed.
    let spread = |foes: usize| {
        let mut p2 = vec![set("Tidewhelp", &["Hunker Down"])];
        if foes == 2 {
            p2.push(set("Tidewhelp", &["Hunker Down"]));
        }
        let mut battle = Battle::doubles(
            dex(),
            [
                &[
                    set("Brawlstag", &["Rockfall"]),
                    set("Craghorn", &["Hunker Down"]),
                ],
                &p2,
            ],
            7,
        )
        .expect("the teams are valid");
        let p2_choices = if foes == 2 {
            [Choice::Move(0), Choice::Move(0)]
        } else {
            [Choice::Move(0), Choice::Pass]
        };
        let events = battle
            .submit_doubles([[Choice::Move(0), Choice::Move(0)], p2_choices])
            .expect("the choices are valid")
            .to_vec();
        (damage(&events, P2A), damage(&events, P2B))
    };
    let (alone, none) = spread(1);
    assert!(none.is_empty());
    let (first, second) = spread(2);
    assert_eq!(second.len(), 1, "both foes are hit");
    if let ([alone], [first]) = (alone.as_slice(), first.as_slice()) {
        let ratio = f64::from(*first) / f64::from(*alone);
        assert!((0.6..0.9).contains(&ratio), "{alone} -> {first}");
    }
}

#[test]
fn a_move_at_a_fainted_foe_hits_the_other_one() {
    let mut battle = doubles(
        &[
            set("Brawlstag", &["Haymaker"]),
            set("Galewing", &["Pounce"]),
        ],
        &[
            set("Tidewhelp", &["Hunker Down"]),
            set("Zaplet", &["Hunker Down"]),
        ],
        9,
    );
    let mut state = battle.state().clone();
    state.sides[1].team[0].hp = 1;
    let mut battle_with_weak_foe =
        Battle::from_state(dex(), state).expect("the edited state is valid");
    // Both attack p2a; the faster knocks it out, so the slower's Pounce goes to p2b.
    let events = battle_with_weak_foe
        .submit_doubles([
            [Choice::MoveAt(0, 1), Choice::MoveAt(0, 1)],
            [Choice::Move(0), Choice::Move(0)],
        ])
        .expect("the choices are valid")
        .to_vec();
    assert!(events.contains(&Event::Faint { pokemon: P2A }));
    assert!(!damage(&events, P2B).is_empty(), "retargeted to p2b");
    // The untouched battle still offers both foes as targets.
    assert!(
        battle
            .choices(P1A)
            .any(|choice| choice == Choice::MoveAt(0, 2))
    );
    battle
        .submit_doubles([
            [Choice::MoveAt(0, 1), Choice::MoveAt(0, 2)],
            [Choice::Move(0), Choice::Move(0)],
        ])
        .expect("the choices are valid");
}

#[test]
fn follow_me_draws_moves_aimed_at_its_ally() {
    let mut battle = doubles(
        &[
            set("Brawlstag", &["Pounce"]),
            set("Craghorn", &["Hunker Down"]),
        ],
        &[
            set("Tidewhelp", &["Lure Call"]),
            set("Zaplet", &["Hunker Down"]),
        ],
        11,
    );
    let events = battle
        .submit_doubles([
            [Choice::MoveAt(0, 2), Choice::Move(0)],
            [Choice::Move(0), Choice::Move(0)],
        ])
        .expect("the choices are valid")
        .to_vec();
    assert!(!damage(&events, P2A).is_empty(), "drawn to p2a");
    assert!(damage(&events, P2B).is_empty());

    // With no ally to draw attention from, it fails.
    let mut singles = Battle::new(
        dex(),
        [
            &[set("Tidewhelp", &["Lure Call"])],
            &[set("Zaplet", &["Pounce"])],
        ],
        11,
    )
    .expect("the teams are valid");
    let events = singles
        .submit([Choice::Move(0), Choice::Move(0)])
        .expect("the choices are valid")
        .to_vec();
    assert!(events.contains(&Event::Fail {
        pokemon: Position::from(SideId::P1)
    }));
}

#[test]
fn helping_hand_powers_up_the_allys_move() {
    let pounce = |helper_move: &str| {
        let mut battle = doubles(
            &[
                set("Galewing", &[helper_move]),
                set("Brawlstag", &["Pounce"]),
            ],
            &[
                set("Tidewhelp", &["Hunker Down"]),
                set("Zaplet", &["Hunker Down"]),
            ],
            13,
        );
        let helper = if helper_move == "Cheer On" {
            Choice::MoveAt(0, -2)
        } else {
            Choice::Move(0)
        };
        let events = battle
            .submit_doubles([
                [helper, Choice::MoveAt(0, 1)],
                [Choice::Move(0), Choice::Move(0)],
            ])
            .expect("the choices are valid")
            .to_vec();
        damage(&events, P2A)
    };
    let (plain, helped) = (pounce("Hunker Down"), pounce("Cheer On"));
    let ([plain], [helped]) = (plain.as_slice(), helped.as_slice()) else {
        panic!("one hit each: {plain:?} {helped:?}");
    };
    let ratio = f64::from(*helped) / f64::from(*plain);
    assert!((1.3..1.7).contains(&ratio), "{plain} -> {helped}");
}

#[test]
fn wide_guard_blocks_spread_moves_at_its_side() {
    let mut battle = doubles(
        &[
            set("Brawlstag", &["Rockfall"]),
            set("Craghorn", &["Hunker Down"]),
        ],
        &[
            set("Tidewhelp", &["Rampart Wall"]),
            set("Zaplet", &["Hunker Down"]),
        ],
        15,
    );
    let events = battle
        .submit_doubles([
            [Choice::Move(0), Choice::Move(0)],
            [Choice::Move(0), Choice::Move(0)],
        ])
        .expect("the choices are valid")
        .to_vec();
    assert!(damage(&events, P2A).is_empty());
    assert!(damage(&events, P2B).is_empty());
    let blocked = events
        .iter()
        .filter(|event| {
            matches!(
                event,
                Event::SideActivate {
                    side: SideId::P2,
                    ..
                }
            )
        })
        .count();
    assert_eq!(blocked, 2, "each foe is protected");
    assert!(
        battle.state().sides[1].conditions.is_empty(),
        "it lasts one turn"
    );
}
