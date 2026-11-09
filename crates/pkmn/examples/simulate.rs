//! Plays random battles with the sample content and reports engine throughput.
//!
//! Teams are generated before timing starts, and choices come from [`Battle::choices`] into a
//! reused buffer, so the measurement covers building battles and resolving turns.
//!
//! ```sh
//! cargo run --release -p pkmn --example simulate -- 20000
//! cargo run -p pkmn --example simulate -- 1 --log
//! cargo run --release -p pkmn --example simulate -- 20000 --doubles
//! cargo run --release -p pkmn --example simulate -- 20000 --triples
//! cargo run --release -p pkmn --example simulate -- 20000 --free-for-all
//! ```

use std::sync::Arc;
use std::time::Instant;

use pkmn::battle::{DamageSource, Effect, HealSource, TeraType};
use pkmn::dex::{AbilityId, ItemId, MoveId, NatureId, SpeciesId};
use pkmn::prng::Prng;
use pkmn::{Battle, Choice, Dex, Event, Outcome, PokemonSet, Position, SideId};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let battles: u64 = arguments.next().map_or(Ok(1_000), |count| count.parse())?;
    let flags: Vec<String> = arguments.collect();
    let log = flags.iter().any(|flag| flag == "--log");
    let free_for_all = flags.iter().any(|flag| flag == "--free-for-all");
    let per_side: u8 = if flags.iter().any(|flag| flag == "--triples") {
        3
    } else if flags.iter().any(|flag| flag == "--doubles") {
        2
    } else {
        1
    };
    let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON)?);
    let names = Names::new(&dex);
    let setups: Vec<[Vec<PokemonSet>; 4]> = (0..battles)
        .map(|seed| {
            let mut prng = Prng::new(seed ^ 0x9E37_79B9_7F4A_7C15);
            [(); 4].map(|()| names.random_team(&mut prng))
        })
        .collect();

    let started = Instant::now();
    let mut steps = 0_u64;
    let mut wins = [0_u64; 4];
    let mut options = Vec::with_capacity(16);
    for (seed, teams) in (0..battles).zip(&setups) {
        let mut prng = Prng::new(seed);
        let all = teams.each_ref().map(Vec::as_slice);
        let teams = [all[0], all[1]];
        let mut battle = match per_side {
            _ if free_for_all => Battle::free_for_all(Arc::clone(&dex), all, seed)?,
            3 => Battle::triples(Arc::clone(&dex), teams, seed)?,
            2 => Battle::doubles(Arc::clone(&dex), teams, seed)?,
            _ => Battle::new(Arc::clone(&dex), teams, seed)?,
        };
        let sides = battle.state().sides.len();
        if log {
            print_events(&dex, battle.events());
        }
        while battle.outcome().is_none() {
            let events = if per_side > 1 || free_for_all {
                // Positions can conflict, by switching to the same creature or Terastallizing
                // together, so a side picks again until its choices fit together.
                loop {
                    let choices = SideId::ALL.map(|side| {
                        [0, 1, 2].map(|index| {
                            options.clear();
                            if index < per_side && side.index() < sides {
                                options.extend(battle.choices(Position::new(side, index)));
                            }
                            if options.is_empty() {
                                Choice::Pass
                            } else {
                                pick(&options, &mut prng)
                            }
                        })
                    });
                    if battle.submit_all(&choices).is_ok() {
                        break battle.events();
                    }
                }
            } else {
                let choices = SideId::BOTH.map(|side| {
                    options.clear();
                    options.extend(battle.choices(side));
                    pick(&options, &mut prng)
                });
                battle.submit(choices)?
            };
            if log {
                print_events(&dex, events);
            }
            steps += 1;
        }
        if let Some(Outcome::Win(side)) = battle.outcome() {
            wins[side.index()] += 1;
        }
    }
    let elapsed = started.elapsed().as_secs_f64();
    let per_second = |count: u64| f64::from(u32::try_from(count).unwrap_or(u32::MAX)) / elapsed;
    println!(
        "{battles} battles, {steps} steps in {elapsed:.3}s: {:.0} battles/s, {:.0} steps/s (wins {:?})",
        per_second(battles),
        per_second(steps),
        &wins[..if free_for_all { 4 } else { 2 }],
    );
    Ok(())
}

fn pick<T: Copy>(options: &[T], prng: &mut Prng) -> T {
    let length = u32::try_from(options.len()).expect("few options");
    options[usize::try_from(prng.below(length)).expect("index fits")]
}

/// Content names to build random sets from, gathered once.
struct Names {
    species: Vec<String>,
    moves: Vec<String>,
    abilities: Vec<String>,
    items: Vec<String>,
    natures: Vec<String>,
}

impl Names {
    fn new(dex: &Dex) -> Self {
        let ids = |count: usize| (0..count).filter_map(|index| u16::try_from(index).ok());
        let small_ids = |count: usize| (0..count).filter_map(|index| u8::try_from(index).ok());
        Self {
            species: ids(dex.species_count())
                .map(|id| dex.species(SpeciesId(id)).name.clone())
                .collect(),
            moves: ids(dex.move_count())
                .map(|id| dex.move_data(MoveId(id)).name.clone())
                .filter(|name| name != "Struggle")
                .collect(),
            abilities: ids(dex.ability_count())
                .map(|id| dex.ability(AbilityId(id)).name.clone())
                .collect(),
            items: ids(dex.item_count())
                .map(|id| dex.item(ItemId(id)).name.clone())
                .collect(),
            natures: small_ids(dex.nature_count())
                .map(|id| dex.nature(NatureId(id)).name.clone())
                .collect(),
        }
    }

    fn random_team(&self, prng: &mut Prng) -> Vec<PokemonSet> {
        (0..6)
            .map(|_| {
                let mut moves: Vec<&str> = Vec::new();
                while moves.len() < 4 {
                    let name = pick_name(&self.moves, prng);
                    if !moves.contains(&name.as_str()) {
                        moves.push(name);
                    }
                }
                let mut set = PokemonSet::new(pick_name(&self.species, prng), &moves);
                set.nature = Some(pick_name(&self.natures, prng).clone());
                if !prng.chance(1, 3) {
                    set.ability = Some(pick_name(&self.abilities, prng).clone());
                }
                if !prng.chance(1, 3) {
                    set.item = Some(pick_name(&self.items, prng).clone());
                }
                set
            })
            .collect()
    }
}

fn pick_name<'a>(names: &'a [String], prng: &mut Prng) -> &'a String {
    let length = u32::try_from(names.len()).expect("few names");
    &names[usize::try_from(prng.below(length)).expect("index fits")]
}

fn print_events(dex: &Dex, events: &[Event]) {
    for event in events {
        println!("{}", describe(dex, event));
    }
}

fn effect_name(dex: &Dex, effect: Effect) -> &str {
    match effect {
        Effect::Ability(id) => &dex.ability(id).name,
        Effect::Item(id) => &dex.item(id).name,
    }
}

fn damage_source(dex: &Dex, from: DamageSource) -> String {
    match from {
        DamageSource::Move => String::new(),
        DamageSource::Status(status) => format!(" from {}", status.id()),
        DamageSource::Weather(weather) => format!(" from {}", dex.weather(weather).name),
        DamageSource::Effect(effect) => format!(" from {}", effect_name(dex, effect)),
        DamageSource::Hazard(condition) => format!(" from {}", dex.side_condition(condition).name),
        other => format!(" from {other:?}"),
    }
}

fn heal_source(dex: &Dex, from: HealSource) -> String {
    match from {
        HealSource::Drain => " by draining".to_owned(),
        HealSource::Move => String::new(),
        HealSource::Effect(effect) => format!(" from {}", effect_name(dex, effect)),
        HealSource::Terrain(terrain) => format!(" from {}", dex.terrain(terrain).name),
        HealSource::LeechSeed => " by Leech Seed".to_owned(),
    }
}

fn side_name(side: SideId) -> &'static str {
    match side {
        SideId::P1 => "P1",
        SideId::P2 => "P2",
        SideId::P3 => "P3",
        SideId::P4 => "P4",
    }
}

fn describe(dex: &Dex, event: &Event) -> String {
    match *event {
        Event::Turn { turn } => format!("\n== Turn {turn} =="),
        Event::Switch {
            pokemon: side,
            species,
            hp,
            max_hp,
            ..
        } => format!(
            "{} sent out {} ({hp}/{max_hp})",
            side,
            dex.species(species).name
        ),
        Event::Move { .. }
        | Event::Prepare { .. }
        | Event::Terastallize { .. }
        | Event::Cant { .. }
        | Event::Miss { .. }
        | Event::Fail { .. }
        | Event::Immune { .. }
        | Event::Crit { .. }
        | Event::SuperEffective { .. }
        | Event::Resisted { .. } => describe_move_event(dex, event),
        Event::Damage {
            pokemon: side,
            amount,
            hp,
            from,
        } => format!(
            "{} lost {amount} HP{} ({hp} left)",
            side,
            damage_source(dex, from)
        ),
        Event::Heal {
            pokemon: side,
            amount,
            hp,
            from,
        } => format!(
            "{} restored {amount} HP{} ({hp} now)",
            side,
            heal_source(dex, from)
        ),
        Event::HitCount { hits } => format!("Hit {hits} time(s)!"),
        Event::Ability {
            pokemon: side,
            ability,
        } => {
            format!("[{}'s {}]", side, dex.ability(ability).name)
        }
        Event::Item {
            pokemon: side,
            item,
        } => format!("[{}'s {}]", side, dex.item(item).name),
        Event::EndItem {
            pokemon: side,
            item,
        } => {
            format!("{} used up its {}", side, dex.item(item).name)
        }
        Event::Faint { pokemon: side } => format!("{side} fainted!"),
        Event::Win { side } => format!("\n{} wins!", side_name(side)),
        Event::Tie => "\nIt's a tie!".to_owned(),
        _ => describe_condition_event(dex, event),
    }
}

/// A move being used, and how it went.
fn describe_move_event(dex: &Dex, event: &Event) -> String {
    match *event {
        Event::Move {
            pokemon: side,
            move_id,
        } => {
            format!("{} used {}!", side, dex.move_data(move_id).name)
        }
        Event::Prepare {
            pokemon: side,
            move_id,
        } => {
            format!("{} is charging {}!", side, dex.move_data(move_id).name)
        }
        Event::Terastallize {
            pokemon: side,
            tera_type,
        } => format!(
            "{} Terastallized into {}!",
            side,
            match tera_type {
                TeraType::Type(type_id) => dex.type_data(type_id).name.as_str(),
                TeraType::Stellar => "Stellar",
            }
        ),
        Event::Cant {
            pokemon: side,
            reason,
        } => format!("{side} can't move: {reason:?}"),
        Event::Miss { pokemon: side } => format!("{side}'s attack missed!"),
        Event::Fail { .. } => "But it failed!".to_owned(),
        Event::Immune { pokemon: side } => {
            format!("It doesn't affect {side}...")
        }
        Event::Crit { .. } => "A critical hit!".to_owned(),
        Event::SuperEffective { .. } => "It's super effective!".to_owned(),
        Event::Resisted { .. } => "It's not very effective...".to_owned(),
        other => format!("{other:?}"),
    }
}

/// Statuses, volatile statuses, stat stages, weather, terrain, and side conditions.
fn describe_condition_event(dex: &Dex, event: &Event) -> String {
    match *event {
        Event::Status {
            pokemon: side,
            status,
        } => format!("{} got {}!", side, status.id()),
        Event::CureStatus {
            pokemon: side,
            status,
        } => {
            format!("{} is cured of {}", side, status.id())
        }
        Event::Start {
            pokemon: side,
            volatile,
        } => format!("{side} gained {volatile:?}!"),
        Event::Activate {
            pokemon: side,
            volatile,
        } => {
            format!("{side} is affected by {volatile:?}...")
        }
        Event::End {
            pokemon: side,
            volatile,
        } => format!("{side}'s {volatile:?} ended."),
        Event::Boost {
            pokemon: side,
            stat,
            stages,
        } => {
            format!("{side}'s {stat:?} changed by {stages:+}")
        }
        Event::Weather {
            weather: Some(weather),
        } => format!("{} began.", dex.weather(weather).name),
        Event::Weather { weather: None } => "The weather cleared.".to_owned(),
        Event::Terrain {
            terrain: Some(terrain),
        } => format!("{} spread over the field.", dex.terrain(terrain).name),
        Event::Terrain { terrain: None } => "The terrain faded.".to_owned(),
        Event::SideStart { side, condition } => format!(
            "{} now covers {}'s side.",
            dex.side_condition(condition).name,
            side_name(side)
        ),
        Event::SideEnd { side, condition } => format!(
            "{} wore off on {}'s side.",
            dex.side_condition(condition).name,
            side_name(side)
        ),
        other => format!("{other:?}"),
    }
}
