//! Behavior of triples battles: adjacency, spread moves, shifting, and centering.

use std::sync::Arc;

use pkmn::battle::{ChoiceErrorReason, DamageSource};
use pkmn::{Battle, Choice, Dex, Event, PokemonSet, Position, SideId};

const P1A: Position = Position::new(SideId::P1, 0);
const P1B: Position = Position::new(SideId::P1, 1);
const P2A: Position = Position::new(SideId::P2, 0);
const P2B: Position = Position::new(SideId::P2, 1);
const P2C: Position = Position::new(SideId::P2, 2);

fn dex() -> Arc<Dex> {
    Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"))
}

fn set(species: &str, moves: &[&str]) -> PokemonSet {
    PokemonSet::new(species, moves)
}

fn triples(p1: &[PokemonSet], p2: &[PokemonSet], seed: u64) -> Battle {
    Battle::triples(dex(), [p1, p2], seed).expect("the teams are valid")
}

fn trio(moves: &[&str]) -> [PokemonSet; 3] {
    [
        set("Brawlstag", moves),
        set("Tidewhelp", &["Hunker Down"]),
        set("Zaplet", &["Hunker Down"]),
    ]
}

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

const HUNKER: [Choice; 3] = [Choice::Move(0), Choice::Move(0), Choice::Move(0)];

#[test]
fn an_edge_can_only_aim_at_adjacent_positions() {
    let pouncers = ["Brawlstag", "Tidewhelp", "Zaplet"].map(|species| set(species, &["Pounce"]));
    let battle = triples(&pouncers, &pouncers, 1);
    assert_eq!(battle.state().positions().len(), 6);
    assert_eq!(Position::new(SideId::P1, 2).to_string(), "p1c");
    let choices: Vec<Choice> = battle.choices(P1A).collect();
    // From p1a: the foes across and diagonally across (p2b, p2c), and the neighbouring ally.
    for choice in [
        Choice::MoveAt(0, 2),
        Choice::MoveAt(0, 3),
        Choice::MoveAt(0, -2),
    ] {
        assert!(choices.contains(&choice), "{choice:?} in {choices:?}");
    }
    for (location, what) in [(1, "the far foe"), (-3, "the far ally")] {
        assert!(
            !choices.contains(&Choice::MoveAt(0, location)),
            "not {what}"
        );
        assert_eq!(
            battle
                .validate(P1A, Choice::MoveAt(0, location))
                .unwrap_err()
                .reason,
            ChoiceErrorReason::InvalidTarget
        );
    }
    // The center reaches every foe.
    let center: Vec<Choice> = battle.choices(P1B).collect();
    for location in [1, 2, 3, -1, -3] {
        assert!(center.contains(&Choice::MoveAt(0, location)));
    }
}

#[test]
fn spread_moves_from_an_edge_hit_only_adjacent_foes() {
    let mut battle = triples(&trio(&["Rockfall"]), &trio(&["Hunker Down"]), 1);
    let events = battle
        .submit_all(&[HUNKER, HUNKER])
        .expect("the choices are valid")
        .to_vec();
    let hit = damaged(&events);
    assert!(hit.contains(&P2B) && hit.contains(&P2C), "{hit:?}");
    assert!(!hit.contains(&P2A), "p2a is out of reach");
}

#[test]
fn an_edge_can_shift_to_the_center() {
    let mut battle = triples(&trio(&["Hunker Down"]), &trio(&["Hunker Down"]), 5);
    assert!(battle.choices(P1A).any(|choice| choice == Choice::Shift));
    assert!(!battle.choices(P1B).any(|choice| choice == Choice::Shift));
    assert_eq!(
        battle.validate(P1B, Choice::Shift).unwrap_err().reason,
        ChoiceErrorReason::WrongKind
    );
    let before = battle.state().sides[0].active;
    let events = battle
        .submit_all(&[[Choice::Shift, Choice::Move(0), Choice::Move(0)], HUNKER])
        .expect("the choices are valid")
        .to_vec();
    assert!(events.contains(&Event::Swap {
        pokemon: P1A,
        to: P1B
    }));
    let after = battle.state().sides[0].active;
    assert_eq!(
        [after[0], after[1], after[2]],
        [before[1], before[0], before[2]]
    );
    // Doubles has no shifting.
    let doubles = Battle::doubles(dex(), [&trio(&["Hunker Down"]), &trio(&["Hunker Down"])], 5)
        .expect("the teams are valid");
    assert!(doubles.validate(P1A, Choice::Shift).is_err());
}

#[test]
fn the_last_two_creatures_move_to_the_center_when_out_of_reach() {
    let battle = triples(&trio(&["Hunker Down"]), &trio(&["Hunker Down"]), 7);
    let mut state = battle.state().clone();
    // Only p1a and p2a stand, at opposite ends.
    for side in &mut state.sides {
        for pokemon in &mut side.team[1..] {
            pokemon.hp = 0;
        }
    }
    let mut battle = Battle::from_state(dex(), state).expect("the edited state is valid");
    let events = battle
        .submit_all(&[
            [Choice::Move(0), Choice::Pass, Choice::Pass],
            [Choice::Move(0), Choice::Pass, Choice::Pass],
        ])
        .expect("the choices are valid")
        .to_vec();
    assert!(events.contains(&Event::Center), "{events:?}");
    for side in &battle.state().sides {
        assert_eq!(side.active[1], Some(0), "the survivor is in the center");
    }
}
