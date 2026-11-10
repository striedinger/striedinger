//! Mechanics that change who acts and when: Trick Room, Prankster, and Sucker Punch.

mod common;

use common::{P1, P1A, P2, P2A, damage_to, edit, max_hp, movers, play, set, start};
use pkmn::battle::{DamageSource, PseudoWeatherState};
use pkmn::{Choice, Event, PokemonSet};

fn with_ability(species: &str, moves: &[&str], ability: &str) -> PokemonSet {
    let mut pokemon = set(species, moves);
    pokemon.ability = Some(ability.to_owned());
    pokemon
}

fn pseudo_weather_events(events: &[Event]) -> (usize, usize) {
    let started = events
        .iter()
        .filter(|event| matches!(event, Event::PseudoWeatherStart { .. }))
        .count();
    let ended = events
        .iter()
        .filter(|event| matches!(event, Event::PseudoWeatherEnd { .. }))
        .count();
    (started, ended)
}

#[test]
fn twisted_room_lets_slower_creatures_act_first_until_used_again() {
    // Galewing is far faster than Craghorn.
    let mut battle = start(
        &[set("Galewing", &["Pounce", "Twist Room"])],
        &[set("Craghorn", &["Pounce"])],
        1,
    );
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(0))),
        [P1, P2]
    );
    // At priority -7, Twist Room goes last; from then on the slower creature acts first.
    let events = play(&mut battle, Choice::Move(1), Choice::Move(0));
    assert_eq!(movers(&events), [P2, P1]);
    assert_eq!(pseudo_weather_events(&events), (1, 0));
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(0))),
        [P2, P1]
    );
    // Using it again ends it.
    let events = play(&mut battle, Choice::Move(1), Choice::Move(0));
    assert_eq!(pseudo_weather_events(&events), (0, 1));
    assert!(battle.state().field.pseudo_weathers.is_empty());
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(0))),
        [P1, P2]
    );
}

#[test]
fn twisted_room_wears_off_when_its_turns_run_out() {
    let battle = start(
        &[set("Galewing", &["Pounce"])],
        &[set("Craghorn", &["Pounce"])],
        2,
    );
    let room = battle
        .dex()
        .pseudo_weather_id("Twisted Room")
        .expect("in the sample");
    let mut battle = edit(battle, |state| {
        state.field.pseudo_weathers = vec![PseudoWeatherState {
            id: room,
            duration: 1,
        }];
    });
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert_eq!(movers(&events), [P2, P1], "reversed for its last turn");
    assert_eq!(pseudo_weather_events(&events), (0, 1));
    assert!(battle.state().active(P1).hp < max_hp(&battle, P1));
}

#[test]
fn mischief_raises_status_moves_but_dark_types_are_immune() {
    // Craghorn is slower than Galewing, but its status move goes first.
    let mut battle = start(
        &[with_ability(
            "Craghorn",
            &["Dizzy Dance", "Pounce"],
            "Mischief",
        )],
        &[set("Galewing", &["Pounce"])],
        3,
    );
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(0))),
        [P1, P2]
    );
    // Only status moves are raised.
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(1), Choice::Move(0))),
        [P2, P1]
    );
    // Frostmaw is part Dark.
    let mut battle = start(
        &[with_ability("Craghorn", &["Dizzy Dance"], "Mischief")],
        &[set("Frostmaw", &["Hunker Down"])],
        3,
    );
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert!(
        events.contains(&Event::Immune { pokemon: P2A }),
        "{events:?}"
    );
}

#[test]
fn ambush_strike_fails_unless_the_target_is_about_to_attack() {
    let mut battle = start(
        &[set("Craghorn", &["Ambush Strike"])],
        &[set("Galewing", &["Hunker Down", "Pounce"])],
        4,
    );
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert!(events.contains(&Event::Fail { pokemon: P1A }), "{events:?}");
    assert!(damage_to(&events, P2, DamageSource::Move).is_empty());
    // Against an attack it strikes first, at priority +1.
    let events = play(&mut battle, Choice::Move(0), Choice::Move(1));
    assert_eq!(movers(&events), [P1, P2]);
    assert!(!damage_to(&events, P2, DamageSource::Move).is_empty());
}
