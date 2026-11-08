//! Differential test against Pokémon Showdown.
//!
//! `oracle/` records random battles from Showdown with the sample content pack injected and
//! writes every step's choices and resulting state to `tests/fixtures/showdown.json`. This test
//! replays them through pkmn from the same seed and requires identical state after every step:
//! stats, HP, statuses, items, active slots, stat stages, weather, the turn, and the winner.
//!
//! Regenerate the recording with `pnpm --filter @workspace/pkmn-oracle generate`.

use std::path::Path;
use std::sync::Arc;

use pkmn::dex::Status;
use pkmn::stats::{BoostStat, StatTable};
use pkmn::{Battle, Choice, Dex, Outcome, PokemonSet};
use serde::Deserialize;

const FIXTURE: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/showdown.json");

const BOOST_ORDER: [BoostStat; 7] = [
    BoostStat::Attack,
    BoostStat::Defense,
    BoostStat::SpecialAttack,
    BoostStat::SpecialDefense,
    BoostStat::Speed,
    BoostStat::Accuracy,
    BoostStat::Evasion,
];

#[derive(Deserialize)]
struct Recording {
    generator: String,
    battles: Vec<RecordedBattle>,
}

#[derive(Deserialize)]
struct RecordedBattle {
    seed: String,
    teams: [Vec<PokemonSet>; 2],
    stats: [Vec<StatTable>; 2],
    start: Snapshot,
    steps: Vec<Step>,
}

#[derive(Deserialize)]
struct Step {
    choices: [Choice; 2],
    after: Snapshot,
}

#[derive(Debug, PartialEq, Eq, Deserialize)]
struct Snapshot {
    turn: u32,
    weather: Option<String>,
    winner: Option<String>,
    sides: Vec<SideSnapshot>,
}

#[derive(Debug, PartialEq, Eq, Deserialize)]
struct SideSnapshot {
    active: usize,
    team: Vec<PokemonSnapshot>,
    boosts: Vec<i8>,
}

#[derive(Debug, PartialEq, Eq, Deserialize)]
struct PokemonSnapshot {
    hp: u16,
    status: Option<Status>,
    item: Option<String>,
}

fn snapshot(battle: &Battle) -> Snapshot {
    let dex = battle.dex();
    let state = battle.state();
    Snapshot {
        turn: state.turn,
        weather: state
            .field
            .weather
            .map(|weather| dex.weather(weather.id).name.clone()),
        winner: battle.outcome().map(|outcome| {
            match outcome {
                Outcome::Win(pkmn::SideId::P1) => "p1",
                Outcome::Win(pkmn::SideId::P2) => "p2",
                Outcome::Tie => "tie",
            }
            .to_owned()
        }),
        sides: state
            .sides
            .iter()
            .map(|side| SideSnapshot {
                active: side.active,
                team: side
                    .team
                    .iter()
                    .map(|pokemon| PokemonSnapshot {
                        hp: pokemon.hp,
                        status: pokemon.status,
                        item: pokemon.item.map(|item| dex.item(item).name.clone()),
                    })
                    .collect(),
                boosts: BOOST_ORDER
                    .iter()
                    .map(|&stat| side.active().boosts.get(stat))
                    .collect(),
            })
            .collect(),
    }
}

fn replay(dex: &Arc<Dex>, index: usize, recorded: &RecordedBattle) {
    let seed = u64::from_str_radix(&recorded.seed, 16).expect("seeds are 16 hex digits");
    let context = format!("battle {index} (seed {})", recorded.seed);
    let mut battle = Battle::new(
        Arc::clone(dex),
        [&recorded.teams[0], &recorded.teams[1]],
        seed,
    )
    .unwrap_or_else(|error| panic!("{context}: {error}"));
    for (side, expected) in battle.state().sides.iter().zip(&recorded.stats) {
        let stats: Vec<StatTable> = side.team.iter().map(|pokemon| pokemon.stats).collect();
        assert_eq!(&stats, expected, "{context}: stats differ");
    }
    assert_eq!(
        snapshot(&battle),
        recorded.start,
        "{context}: start differs"
    );
    for (number, step) in recorded.steps.iter().enumerate() {
        let events = battle
            .submit(step.choices)
            .unwrap_or_else(|error| panic!("{context}, step {number}: {error}"))
            .to_vec();
        let actual = snapshot(&battle);
        assert!(
            actual == step.after,
            "{context}, step {number} with {:?}\nShowdown: {:#?}\npkmn: {actual:#?}\nevents: {events:#?}",
            step.choices,
            step.after,
        );
    }
}

#[test]
fn replays_showdown_battles_identically() {
    if !Path::new(FIXTURE).exists() {
        eprintln!(
            "skipping: no Showdown recording at {FIXTURE}; run `pnpm --filter @workspace/pkmn-oracle generate`"
        );
        return;
    }
    let json = std::fs::read_to_string(FIXTURE).expect("the recording is readable");
    let recording: Recording = serde_json::from_str(&json).expect("the recording parses");
    assert!(
        !recording.battles.is_empty(),
        "{} recorded no battles",
        recording.generator
    );
    let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"));
    for (index, recorded) in recording.battles.iter().enumerate() {
        replay(&dex, index, recorded);
    }
}
