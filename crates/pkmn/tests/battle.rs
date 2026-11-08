//! Behavior of full battles driven through the public API.

use std::sync::Arc;

use pkmn::battle::{
    CantMoveReason, ChoiceErrorReason, DamageCause, HealCause, StatusCondition, TeamErrorReason,
};
use pkmn::dex::StatusKind;
use pkmn::prng::Prng;
use pkmn::stats::BoostStat;
use pkmn::{Battle, BattleState, Choice, Dex, Event, Outcome, PokemonSet, Request, SideId};

const P1: SideId = SideId::P1;
const P2: SideId = SideId::P2;

fn dex() -> Arc<Dex> {
    Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"))
}

fn set(species: &str, moves: &[&str]) -> PokemonSet {
    PokemonSet::new(species, moves)
}

fn start(p1: &[PokemonSet], p2: &[PokemonSet], seed: u64) -> Battle {
    Battle::new(dex(), [p1, p2], seed).expect("the teams are valid")
}

fn edit(battle: Battle, change: impl FnOnce(&mut BattleState)) -> Battle {
    let dex = Arc::new(battle.dex().clone());
    let mut state = battle.into_state();
    change(&mut state);
    Battle::from_state(dex, state).expect("the edited state is valid")
}

fn play(battle: &mut Battle, p1: Choice, p2: Choice) -> Vec<Event> {
    battle
        .submit([p1, p2])
        .expect("the choices are valid")
        .to_vec()
}

fn movers(events: &[Event]) -> Vec<SideId> {
    events
        .iter()
        .filter_map(|event| match event {
            Event::MoveUsed { side, .. } => Some(*side),
            _ => None,
        })
        .collect()
}

fn damage_to(events: &[Event], target: SideId, wanted: DamageCause) -> Vec<u16> {
    events
        .iter()
        .filter_map(|event| match *event {
            Event::Damaged {
                side,
                amount,
                cause,
                ..
            } if side == target && cause == wanted => Some(amount),
            _ => None,
        })
        .collect()
}

fn max_hp(battle: &Battle, side: SideId) -> u16 {
    battle.state().active(side).max_hp()
}

#[test]
fn faster_creatures_move_first_unless_outprioritized() {
    let mut battle = start(
        &[set("Galewing", &["Pounce"])],
        &[set("Craghorn", &["Pounce", "Swift Strike"])],
        1,
    );
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(0))),
        [P1, P2]
    );
    assert_eq!(
        movers(&play(&mut battle, Choice::Move(0), Choice::Move(1))),
        [P2, P1]
    );
}

#[test]
fn paralysis_halves_speed() {
    let battle = start(
        &[set("Zaplet", &["Pounce"])],
        &[set("Tidewhelp", &["Pounce"])],
        3,
    );
    let mut battle = edit(battle, |state| {
        state.sides[0].team[0].status = Some(StatusCondition::Paralysis);
    });
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert_eq!(movers(&events).first(), Some(&P2));
}

#[test]
fn type_immunities_stop_damaging_moves_and_opted_in_status_moves() {
    let mut battle = start(
        &[set("Zaplet", &["Static Jolt", "Volt Snare"])],
        &[
            set("Craghorn", &["Hunker Down"]),
            set("Zaplet", &["Hunker Down"]),
        ],
        5,
    );
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert!(events.contains(&Event::Immune { side: P2 }));
    assert!(damage_to(&events, P2, DamageCause::Move).is_empty());

    let events = play(&mut battle, Choice::Move(1), Choice::Move(0));
    assert!(events.contains(&Event::Immune { side: P2 }));

    let events = play(&mut battle, Choice::Move(1), Choice::Switch(1));
    let hit = !events.contains(&Event::Missed { side: P1 });
    assert!(
        !hit || events.contains(&Event::Failed { side: P1 }),
        "Electric types cannot be paralyzed"
    );
}

#[test]
fn burn_deals_a_sixteenth_each_turn_and_fire_types_are_immune() {
    for seed in 0..50 {
        let mut battle = start(
            &[set("Zaplet", &["Scorch Veil"])],
            &[
                set("Bramblehog", &["Hunker Down"]),
                set("Cindercub", &["Hunker Down"]),
            ],
            seed,
        );
        let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
        if !events.contains(&Event::StatusInflicted {
            side: P2,
            status: StatusKind::Burn,
        }) {
            continue;
        }
        assert_eq!(
            damage_to(&events, P2, DamageCause::Status),
            [max_hp(&battle, P2) / 16]
        );

        let events = play(&mut battle, Choice::Move(0), Choice::Switch(1));
        if !events.contains(&Event::Missed { side: P1 }) {
            assert!(events.contains(&Event::Failed { side: P1 }));
        }
        return;
    }
    panic!("Scorch Veil never landed");
}

#[test]
fn weather_lasts_five_turns() {
    let mut battle = start(
        &[set("Tidewhelp", &["Rain Call", "Hunker Down"])],
        &[set("Bramblehog", &["Hunker Down"])],
        9,
    );
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    let rain = battle
        .dex()
        .weather_id("Rain")
        .expect("the sample dex has rain");
    assert!(events.contains(&Event::WeatherStarted { weather: rain }));
    for turn in 2..=5 {
        let events = play(&mut battle, Choice::Move(1), Choice::Move(0));
        let ended = events.contains(&Event::WeatherEnded { weather: rain });
        assert_eq!(ended, turn == 5, "turn {turn}");
    }
}

#[test]
fn sandstorm_chips_creatures_that_are_not_immune() {
    let mut battle = start(
        &[set("Craghorn", &["Sand Call"])],
        &[set("Bramblehog", &["Hunker Down"])],
        11,
    );
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert_eq!(
        damage_to(&events, P2, DamageCause::Weather),
        [max_hp(&battle, P2) / 16]
    );
    assert!(damage_to(&events, P1, DamageCause::Weather).is_empty());
}

#[test]
fn rain_boosts_water_moves() {
    let damage_with_rain = |rain: bool| {
        let battle = start(
            &[set("Tidewhelp", &["Riptide"])],
            &[set("Brawlstag", &["Hunker Down"])],
            13,
        );
        let mut battle = edit(battle, |state| {
            if rain {
                state.field.weather = Some(pkmn::battle::ActiveWeather {
                    id: pkmn::dex::WeatherId(0),
                    turns_left: 5,
                });
            }
        });
        damage_to(
            &play(&mut battle, Choice::Move(0), Choice::Move(0)),
            P2,
            DamageCause::Move,
        )
    };
    let dry = damage_with_rain(false)[0];
    let wet = damage_with_rain(true)[0];
    assert!(
        wet > dry * 14 / 10 && wet < dry * 16 / 10,
        "dry {dry}, wet {wet}"
    );
}

#[test]
fn fainted_creatures_must_be_replaced_before_the_next_turn() {
    let battle = start(
        &[
            set("Tidewhelp", &["Riptide"]),
            set("Cindercub", &["Ember Snap"]),
        ],
        &[set("Zaplet", &["Pounce"])],
        17,
    );
    let mut battle = edit(battle, |state| state.sides[0].team[0].hp = 1);
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert!(events.contains(&Event::Fainted { side: P1 }));
    assert!(
        !events
            .iter()
            .any(|event| matches!(event, Event::TurnStarted { .. }))
    );
    assert_eq!(
        battle.request(P1),
        Some(Request::Replace { switches: vec![1] })
    );
    assert_eq!(battle.request(P2), Some(Request::Wait));

    let error = battle.submit([Choice::Move(0), Choice::Pass]).unwrap_err();
    assert_eq!(error.reason, ChoiceErrorReason::WrongKind);

    let events = play(&mut battle, Choice::Switch(1), Choice::Pass);
    assert!(matches!(
        events[0],
        Event::SwitchedIn {
            side: P1,
            slot: 1,
            ..
        }
    ));
    assert_eq!(events.last(), Some(&Event::TurnStarted { turn: 2 }));
}

#[test]
fn the_battle_ends_when_a_side_has_no_creatures_left() {
    let battle = start(
        &[set("Zaplet", &["Pounce"])],
        &[set("Craghorn", &["Tremor"])],
        19,
    );
    let mut battle = edit(battle, |state| state.sides[1].team[0].hp = 1);
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert_eq!(movers(&events), [P1]);
    assert_eq!(battle.outcome(), Some(Outcome::Winner(P1)));
    assert_eq!(battle.request(P1), None);
    let error = battle
        .submit([Choice::Move(0), Choice::Move(0)])
        .unwrap_err();
    assert_eq!(error.reason, ChoiceErrorReason::BattleOver);
}

#[test]
fn an_attacker_knocked_out_by_its_own_recoil_still_wins() {
    let battle = start(
        &[set("Galewing", &["Gale Dive"])],
        &[set("Craghorn", &["Tremor"])],
        23,
    );
    let mut battle = edit(battle, |state| {
        state.sides[0].team[0].hp = 1;
        state.sides[1].team[0].hp = 1;
    });
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    let faints: Vec<_> = events
        .iter()
        .filter(|event| matches!(event, Event::Fainted { .. }))
        .collect();
    assert_eq!(
        faints,
        [&Event::Fainted { side: P2 }, &Event::Fainted { side: P1 }]
    );
    assert_eq!(battle.outcome(), Some(Outcome::Winner(P1)));
}

#[test]
fn struggle_replaces_moves_once_pp_runs_out() {
    let battle = start(
        &[set("Brawlstag", &["Pounce"])],
        &[set("Tidewhelp", &["Hunker Down"])],
        29,
    );
    let mut battle = edit(battle, |state| {
        if let Some(slot) = &mut state.sides[0].team[0].moves[0] {
            slot.pp = 0;
        }
    });
    assert!(matches!(
        battle.request(P1),
        Some(Request::Turn {
            must_struggle: true,
            ..
        })
    ));
    let error = battle
        .submit([Choice::Move(0), Choice::Move(0)])
        .unwrap_err();
    assert_eq!(error.reason, ChoiceErrorReason::MustStruggle);

    let events = play(&mut battle, Choice::Struggle, Choice::Move(0));
    let struggle = battle.dex().struggle();
    assert!(events.contains(&Event::MoveUsed {
        side: P1,
        move_id: struggle
    }));
    let quarter = (u32::from(max_hp(&battle, P1)) * 2 + 4) / 8;
    assert_eq!(
        damage_to(&events, P1, DamageCause::Recoil),
        [u16::try_from(quarter).unwrap()]
    );
}

#[test]
fn sleep_lasts_one_to_three_move_attempts() {
    let mut observed = std::collections::BTreeSet::new();
    for seed in 0..200 {
        let mut battle = start(
            &[set("Zaplet", &["Spore Cloud", "Hunker Down"])],
            &[set("Ironmantis", &["Shade Claw"])],
            seed,
        );
        let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
        if !events.contains(&Event::StatusInflicted {
            side: P2,
            status: StatusKind::Sleep,
        }) {
            continue;
        }
        let mut asleep = 0;
        for _ in 0..5 {
            let events = play(&mut battle, Choice::Move(1), Choice::Move(0));
            asleep += events
                .iter()
                .filter(|event| {
                    **event
                        == Event::CantMove {
                            side: P2,
                            reason: CantMoveReason::Asleep,
                        }
                })
                .count();
            if events.contains(&Event::StatusCured {
                side: P2,
                status: StatusKind::Sleep,
            }) {
                break;
            }
        }
        observed.insert(asleep);
    }
    // The faster sleeper inflicts sleep before the target's first attempt, which counts too,
    // so turns asleep after the first range from zero to two here.
    assert_eq!(observed.into_iter().collect::<Vec<_>>(), [0, 1, 2]);
}

#[test]
fn multi_hit_moves_strike_two_to_five_times() {
    let mut counts = std::collections::BTreeSet::new();
    for seed in 0..200 {
        let mut battle = start(
            &[set("Bramblehog", &["Thorn Volley"])],
            &[set("Tidewhelp", &["Hunker Down"])],
            seed,
        );
        let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
        let hits = events.iter().find_map(|event| match event {
            Event::HitCount { hits } => Some(usize::from(*hits)),
            _ => None,
        });
        if let Some(hits) = hits {
            assert_eq!(damage_to(&events, P2, DamageCause::Move).len(), hits);
            counts.insert(hits);
        }
    }
    assert_eq!(counts.into_iter().collect::<Vec<_>>(), [2, 3, 4, 5]);
}

#[test]
fn draining_moves_restore_half_the_damage_dealt() {
    let battle = start(
        &[set("Bramblehog", &["Sap Siphon"])],
        &[set("Tidewhelp", &["Hunker Down"])],
        31,
    );
    let mut battle = edit(battle, |state| state.sides[0].team[0].hp = 10);
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    let dealt = u32::from(damage_to(&events, P2, DamageCause::Move)[0]);
    let healed = events.iter().find_map(|event| match *event {
        Event::Healed {
            side: P1,
            amount,
            cause: HealCause::Drain,
            ..
        } => Some(u32::from(amount)),
        _ => None,
    });
    assert_eq!(healed, Some(dealt.div_ceil(2)));
}

#[test]
fn boosting_past_six_stages_fails() {
    let mut battle = start(
        &[set("Brawlstag", &["Rally Cry"])],
        &[set("Tidewhelp", &["Hunker Down"])],
        37,
    );
    for _ in 0..3 {
        let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
        assert!(events.contains(&Event::StatChanged {
            side: P1,
            stat: BoostStat::Attack,
            stages: 2
        }));
    }
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    assert!(events.contains(&Event::Failed { side: P1 }));
    assert_eq!(battle.state().active(P1).boosts.get(BoostStat::Attack), 6);
}

#[test]
fn switching_out_clears_boosts_and_confusion() {
    let mut battle = start(
        &[
            set("Brawlstag", &["Rally Cry"]),
            set("Tidewhelp", &["Riptide"]),
        ],
        &[set("Lumifae", &["Dizzy Dance"])],
        41,
    );
    let mut confused = false;
    for _ in 0..5 {
        let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
        confused |= events.contains(&Event::ConfusionStarted { side: P1 });
        if confused {
            break;
        }
    }
    assert!(confused, "Dizzy Dance never landed");
    play(&mut battle, Choice::Switch(1), Choice::Move(0));
    let brawlstag = &battle.state().side(P1).team[0];
    assert_eq!(brawlstag.boosts.get(BoostStat::Attack), 0);
    assert_eq!(brawlstag.volatiles.confusion_turns, 0);
}

#[test]
fn fire_moves_thaw_frozen_targets() {
    let battle = start(
        &[set("Cindercub", &["Ember Snap"])],
        &[set("Craghorn", &["Tremor"])],
        43,
    );
    let mut battle = edit(battle, |state| {
        state.sides[1].team[0].status = Some(StatusCondition::Freeze);
    });
    let events = play(&mut battle, Choice::Move(0), Choice::Move(0));
    let hit = events.iter().position(|event| {
        matches!(
            event,
            Event::Damaged {
                side: P2,
                cause: DamageCause::Move,
                ..
            }
        )
    });
    let thawed = events.iter().position(|event| {
        *event
            == Event::StatusCured {
                side: P2,
                status: StatusKind::Freeze,
            }
    });
    assert!(hit.is_some() && thawed > hit, "{events:?}");
}

#[test]
fn saved_battles_resume_identically() {
    let p1 = [
        set("Frostmaw", &["Frost Fang", "Night Bite"]),
        set("Zaplet", &["Static Jolt"]),
    ];
    let p2 = [
        set("Lumifae", &["Glimmer Beam", "Mind Pulse"]),
        set("Dunewyrm", &["Tremor"]),
    ];
    let mut original = start(&p1, &p2, 2024);
    play(&mut original, Choice::Move(0), Choice::Move(1));

    let saved = serde_json::to_string(original.state()).unwrap();
    let state: BattleState = serde_json::from_str(&saved).unwrap();
    let mut restored = Battle::from_state(dex(), state).unwrap();
    for _ in 0..3 {
        if original.outcome().is_some() || original.state().awaiting_replacements() {
            break;
        }
        let a = play(&mut original, Choice::Move(1), Choice::Move(0));
        let b = play(&mut restored, Choice::Move(1), Choice::Move(0));
        assert_eq!(a, b);
    }
    assert_eq!(original.state(), restored.state());
}

#[test]
fn invalid_teams_are_rejected() {
    let unknown = Battle::new(
        dex(),
        [
            &[set("Missingmon", &["Pounce"])],
            &[set("Zaplet", &["Pounce"])],
        ],
        0,
    );
    assert!(matches!(
        unknown.unwrap_err().reason,
        TeamErrorReason::UnknownSpecies(_)
    ));
    let duplicate = Battle::new(
        dex(),
        [
            &[set("Zaplet", &["Pounce", "pounce"])],
            &[set("Zaplet", &["Pounce"])],
        ],
        0,
    );
    assert!(matches!(
        duplicate.unwrap_err().reason,
        TeamErrorReason::DuplicateMove(_)
    ));
}

fn random_choice(battle: &Battle, side: SideId, prng: &mut Prng) -> Choice {
    let pick = |options: &[Choice], prng: &mut Prng| {
        let index = prng.below(u32::try_from(options.len()).unwrap());
        options[usize::try_from(index).unwrap()]
    };
    match battle.request(side).expect("the battle is ongoing") {
        Request::Turn {
            moves,
            switches,
            must_struggle,
        } => {
            let mut options: Vec<Choice> = moves
                .iter()
                .filter(|option| !option.disabled)
                .map(|option| Choice::Move(option.slot))
                .collect();
            if must_struggle {
                options.push(Choice::Struggle);
            }
            options.extend(switches.into_iter().map(Choice::Switch));
            pick(&options, prng)
        }
        Request::Replace { switches } => {
            let options: Vec<Choice> = switches.into_iter().map(Choice::Switch).collect();
            pick(&options, prng)
        }
        Request::Wait => Choice::Pass,
    }
}

#[test]
fn random_battles_always_finish_with_consistent_state() {
    let dex = dex();
    let species: Vec<String> = (0..dex.species_count())
        .map(|index| {
            dex.species(pkmn::dex::SpeciesId(u16::try_from(index).unwrap()))
                .name
                .clone()
        })
        .collect();
    let moves: Vec<String> = (0..dex.move_count())
        .map(|index| {
            dex.move_data(pkmn::dex::MoveId(u16::try_from(index).unwrap()))
                .name
                .clone()
        })
        .filter(|name| name != "Struggle")
        .collect();
    for seed in 0..300 {
        let mut prng = Prng::new(seed);
        let mut team = || -> Vec<PokemonSet> {
            (0..3)
                .map(|_| {
                    let mut chosen: Vec<&str> = Vec::new();
                    while chosen.len() < 4 {
                        let name = &moves[usize::try_from(
                            prng.below(u32::try_from(moves.len()).unwrap()),
                        )
                        .unwrap()];
                        if !chosen.contains(&name.as_str()) {
                            chosen.push(name);
                        }
                    }
                    let name = &species[usize::try_from(
                        prng.below(u32::try_from(species.len()).unwrap()),
                    )
                    .unwrap()];
                    set(name, &chosen)
                })
                .collect()
        };
        let (p1, p2) = (team(), team());
        let mut battle = Battle::new(Arc::clone(&dex), [&p1, &p2], seed).unwrap();
        let mut turns = 0;
        while battle.outcome().is_none() {
            let choices = [
                random_choice(&battle, P1, &mut prng),
                random_choice(&battle, P2, &mut prng),
            ];
            battle.submit(choices).unwrap();
            for side in &battle.state().sides {
                assert!(
                    side.team
                        .iter()
                        .all(|pokemon| pokemon.hp <= pokemon.max_hp())
                );
            }
            turns += 1;
            assert!(turns < 2_000, "seed {seed} did not finish");
        }
    }
}
