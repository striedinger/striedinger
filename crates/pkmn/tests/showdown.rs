//! Differential test against Pokémon Showdown.
//!
//! `apps/pkmn-oracle` records random battles from Showdown with the sample content pack
//! injected, and writes every step's choices and resulting state to
//! `tests/fixtures/showdown.json`. This test replays them through pkmn from the same seed and
//! requires identical state after every step: stats, HP, statuses, items, PP, active slots,
//! stat stages, Substitute, confusion, Terastallization, weather, terrain, side conditions and
//! their durations, the turn, and the winner.
//!
//! The recordings, singles, doubles and triples, are generated, not committed. Create them
//! with `pnpm --filter @workspace/pkmn-oracle generate`, adding `-- --doubles` or
//! `-- --triples`; without it this test is skipped, unless
//! `PKMN_REQUIRE_SHOWDOWN` is set, as CI does. To debug a divergence, set `PKMN_ONLY` to a
//! battle's seed to replay only that battle, and `PKMN_TRACE_EVENTS` to print each step's
//! events.

use std::sync::Arc;

use pkmn::dex::Status;
use pkmn::stats::{BoostStat, StatTable};
use pkmn::{Battle, Choice, Dex, GameType, Outcome, PokemonSet, SideId};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const FIXTURES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures");

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
#[serde(rename_all = "camelCase")]
struct RecordedBattle {
    game_type: GameType,
    seed: String,
    teams: [Vec<PokemonSet>; 2],
    stats: [Vec<StatTable>; 2],
    start: Snapshot,
    steps: Vec<Step>,
}

#[derive(Deserialize)]
struct Step {
    choices: [Vec<Choice>; 2],
    after: Snapshot,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct Snapshot {
    turn: u32,
    weather: Option<Timed>,
    terrain: Option<Timed>,
    winner: Option<String>,
    sides: Vec<SideSnapshot>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct Timed {
    name: String,
    duration: Option<u8>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SideSnapshot {
    active: Vec<usize>,
    team: Vec<PokemonSnapshot>,
    positions: Vec<PositionSnapshot>,
    conditions: Vec<ConditionSnapshot>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct PositionSnapshot {
    boosts: Vec<i8>,
    substitute: Option<u16>,
    confused: bool,
    terastallized: bool,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct PokemonSnapshot {
    hp: u16,
    status: Option<Status>,
    item: Option<String>,
    pp: Vec<u8>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct ConditionSnapshot {
    name: String,
    duration: Option<u8>,
    layers: u8,
}

fn snapshot(battle: &Battle) -> Snapshot {
    let dex = battle.dex();
    let state = battle.state();
    Snapshot {
        turn: state.turn,
        weather: state.field.weather.map(|weather| Timed {
            name: dex.weather(weather.id).name.clone(),
            duration: Some(weather.duration),
        }),
        terrain: state.field.terrain.map(|terrain| Timed {
            name: dex.terrain(terrain.id).name.clone(),
            duration: Some(terrain.duration),
        }),
        winner: battle.outcome().map(|outcome| {
            match outcome {
                Outcome::Win(SideId::P1) => "p1",
                Outcome::Win(SideId::P2) => "p2",
                Outcome::Tie => "tie",
            }
            .to_owned()
        }),
        sides: state
            .sides
            .iter()
            .map(|side| {
                let actives: Vec<&pkmn::battle::Pokemon> =
                    (0..3).filter_map(|index| side.active_at(index)).collect();
                let mut conditions: Vec<ConditionSnapshot> = side
                    .conditions
                    .iter()
                    .map(|condition| ConditionSnapshot {
                        name: dex.side_condition(condition.id).name.clone(),
                        duration: condition.duration,
                        layers: condition.layers,
                    })
                    .collect();
                conditions.sort_by(|left, right| left.name.cmp(&right.name));
                SideSnapshot {
                    active: side.active.iter().flatten().copied().collect(),
                    team: side
                        .team
                        .iter()
                        .map(|pokemon| PokemonSnapshot {
                            hp: pokemon.hp,
                            // A fainted creature's status is `fnt` in Showdown.
                            status: pokemon.status.filter(|_| !pokemon.is_fainted()),
                            item: pokemon.item.map(|item| dex.item(item).name.clone()),
                            pp: pokemon.moves().map(|(_, slot)| slot.pp).collect(),
                        })
                        .collect(),
                    positions: actives
                        .iter()
                        .map(|active| PositionSnapshot {
                            boosts: BOOST_ORDER
                                .iter()
                                .map(|&stat| active.boosts.get(stat))
                                .collect(),
                            substitute: active.volatiles.substitute,
                            confused: active.volatiles.confusion.is_some(),
                            terastallized: active.terastallized,
                        })
                        .collect(),
                    conditions,
                }
            })
            .collect(),
    }
}

/// Every leaf where the two snapshots differ, as `path: Showdown != pkmn`.
fn difference(showdown: &Snapshot, pkmn: &Snapshot) -> String {
    fn walk(path: &str, theirs: &Value, ours: &Value, lines: &mut Vec<String>) {
        match (theirs, ours) {
            (Value::Object(left), Value::Object(right)) => {
                for (key, value) in left {
                    walk(&format!("{path}.{key}"), value, &right[key], lines);
                }
            }
            (Value::Array(left), Value::Array(right)) if left.len() == right.len() => {
                for (index, (left, right)) in left.iter().zip(right).enumerate() {
                    walk(&format!("{path}[{index}]"), left, right, lines);
                }
            }
            _ if theirs != ours => {
                lines.push(format!("  {path}: Showdown {theirs} != pkmn {ours}"));
            }
            _ => {}
        }
    }
    let mut lines = Vec::new();
    walk(
        "",
        &serde_json::to_value(showdown).expect("snapshots serialize"),
        &serde_json::to_value(pkmn).expect("snapshots serialize"),
        &mut lines,
    );
    lines.join("\n")
}

fn replay(dex: &Arc<Dex>, index: usize, recorded: &RecordedBattle) {
    let seed = u64::from_str_radix(&recorded.seed, 16).expect("seeds are 16 hex digits");
    let context = format!("battle {index} (seed {})", recorded.seed);
    let teams = [recorded.teams[0].as_slice(), recorded.teams[1].as_slice()];
    let mut battle = match recorded.game_type {
        GameType::Singles => Battle::new(Arc::clone(dex), teams, seed),
        GameType::Doubles => Battle::doubles(Arc::clone(dex), teams, seed),
        GameType::Triples => Battle::triples(Arc::clone(dex), teams, seed),
    }
    .unwrap_or_else(|error| panic!("{context}: {error}"));
    for (side, expected) in battle.state().sides.iter().zip(&recorded.stats) {
        let stats: Vec<StatTable> = side.team.iter().map(|pokemon| pokemon.stats).collect();
        assert_eq!(&stats, expected, "{context}: stats differ");
    }
    let start = snapshot(&battle);
    assert!(
        start == recorded.start,
        "{context}: start differs\n{}",
        difference(&recorded.start, &start)
    );
    for (number, step) in recorded.steps.iter().enumerate() {
        let choices = step
            .choices
            .each_ref()
            .map(|side| [0, 1, 2].map(|index| side.get(index).copied().unwrap_or(Choice::Pass)));
        let events = battle
            .submit_all(choices)
            .unwrap_or_else(|error| panic!("{context}, step {number}: {error}"))
            .to_vec();
        if std::env::var_os("PKMN_TRACE_EVENTS").is_some() {
            eprintln!("step {number}: {events:?}");
        }
        let actual = snapshot(&battle);
        assert!(
            actual == step.after,
            "{context}, step {number} with {:?}\n{}\nevents: {events:?}",
            step.choices,
            difference(&step.after, &actual),
        );
    }
}

/// Replays one recording, unless it has not been generated.
fn replay_recording(file: &str, generate: &str) {
    let path = format!("{FIXTURES}/{file}");
    let Ok(json) = std::fs::read_to_string(&path) else {
        assert!(
            std::env::var_os("PKMN_REQUIRE_SHOWDOWN").is_none(),
            "no Showdown recording at {path}"
        );
        eprintln!("skipping: no Showdown recording at {path}; run `{generate}`");
        return;
    };
    let recording: Recording = serde_json::from_str(&json).expect("the recording parses");
    assert!(
        !recording.battles.is_empty(),
        "{} recorded no battles",
        recording.generator
    );
    let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"));
    for (index, recorded) in recording.battles.iter().enumerate() {
        if std::env::var("PKMN_ONLY").is_ok_and(|seed| seed != recorded.seed) {
            continue;
        }
        replay(&dex, index, recorded);
    }
}

#[test]
fn replays_showdown_singles_battles_identically() {
    replay_recording(
        "showdown.json",
        "pnpm --filter @workspace/pkmn-oracle generate",
    );
}

#[test]
fn replays_showdown_doubles_battles_identically() {
    replay_recording(
        "showdown-doubles.json",
        "pnpm --filter @workspace/pkmn-oracle generate -- --doubles",
    );
}

#[test]
fn replays_showdown_triples_battles_identically() {
    replay_recording(
        "showdown-triples.json",
        "pnpm --filter @workspace/pkmn-oracle generate -- --triples",
    );
}
