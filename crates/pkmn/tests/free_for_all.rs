//! Behavior of free-for-all battles: four sides, every other creature a foe.

use std::sync::Arc;

use pkmn::battle::DamageSource;
use pkmn::{Battle, Choice, Dex, Event, Outcome, PokemonSet, Position, SideId};

const P1: Position = Position::new(SideId::P1, 0);
const P2: Position = Position::new(SideId::P2, 0);
const P3: Position = Position::new(SideId::P3, 0);
const P4: Position = Position::new(SideId::P4, 0);

fn dex() -> Arc<Dex> {
    Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"))
}

fn team(moves: &[&str]) -> Vec<PokemonSet> {
    vec![
        PokemonSet::new("Craghorn", moves),
        PokemonSet::new("Tidewhelp", &["Hunker Down"]),
    ]
}

fn free_for_all(first: &[&str], seed: u64) -> Battle {
    let rest = team(&["Hunker Down"]);
    Battle::free_for_all(dex(), [&team(first), &rest, &rest, &rest], seed)
        .expect("the teams are valid")
}

const HUNKER: Choice = Choice::Move(0);

fn damaged(events: &[Event]) -> Vec<Position> {
    events
        .iter()
        .filter_map(|event| match *event {
            Event::Damage {
                pokemon,
                from: DamageSource::Move,
                ..
            } => Some(pokemon),
            _ => None,
        })
        .collect()
}

#[test]
fn four_sides_send_out_one_creature_each() {
    let battle = free_for_all(&["Pounce"], 1);
    assert_eq!(battle.state().sides.len(), 4);
    assert_eq!(battle.state().positions().as_slice(), [P1, P2, P3, P4]);
    assert_eq!(P3.to_string(), "p3a");
    // Showdown's locations: p2 and p4 across, p3 beside p1 on its half of the field.
    let choices: Vec<Choice> = battle.choices(P1).collect();
    for location in [1, 2, -2] {
        assert!(
            choices.contains(&Choice::MoveAt(0, location)),
            "{choices:?}"
        );
    }
    // Leaving the target out picks a random foe.
    assert!(battle.validate(P1, Choice::Move(0)).is_ok());
}

#[test]
fn spread_moves_hit_every_foe() {
    let mut battle = free_for_all(&["Rockfall"], 1);
    let events = battle
        .submit_free_for_all([Choice::Move(0), HUNKER, HUNKER, HUNKER])
        .expect("the choices are valid")
        .to_vec();
    let hit = damaged(&events);
    for foe in [P2, P3, P4] {
        assert!(hit.contains(&foe), "{foe} in {hit:?}");
    }
}

#[test]
fn hazards_land_on_every_foe_side() {
    let mut battle = free_for_all(&["Scatter Stones"], 5);
    battle
        .submit_free_for_all([Choice::Move(0), HUNKER, HUNKER, HUNKER])
        .expect("the choices are valid");
    let sides = &battle.state().sides;
    assert!(sides[0].conditions.is_empty());
    for side in &sides[1..] {
        assert_eq!(side.conditions.len(), 1, "each foe's side has the hazard");
    }
}

#[test]
fn the_last_side_standing_wins() {
    let battle = free_for_all(&["Pounce"], 7);
    let mut state = battle.state().clone();
    // p2 and p3 are out; p4 has one creature left, at 1 HP.
    for side in &mut state.sides[1..3] {
        for pokemon in &mut side.team {
            pokemon.hp = 0;
        }
    }
    state.sides[3].team[0].hp = 1;
    state.sides[3].team[1].hp = 0;
    let mut battle = Battle::from_state(dex(), state).expect("the edited state is valid");
    // Aimed at the fainted p2, the move fails rather than finding another foe.
    let events = battle
        .submit_free_for_all([Choice::MoveAt(0, 1), Choice::Pass, Choice::Pass, HUNKER])
        .expect("the choices are valid")
        .to_vec();
    assert!(damaged(&events).is_empty(), "{events:?}");
    assert_eq!(battle.outcome(), None);
    battle
        .submit_free_for_all([Choice::MoveAt(0, 2), Choice::Pass, Choice::Pass, HUNKER])
        .expect("the choices are valid");
    assert_eq!(battle.outcome(), Some(Outcome::Win(SideId::P1)));
}
