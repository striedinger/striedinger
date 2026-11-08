//! Plays random battles with the sample content and reports engine throughput.
//!
//! Teams are generated before timing starts, and choices come from [`Battle::choices`] into a
//! reused buffer, so the measurement covers building battles and resolving turns.
//!
//! ```sh
//! cargo run --release -p pkmn --example simulate -- 20000
//! cargo run -p pkmn --example simulate -- 1 --log
//! ```

use std::sync::Arc;
use std::time::Instant;

use pkmn::battle::{DamageSource, Effect, HealSource};
use pkmn::dex::{AbilityId, ItemId, MoveId, NatureId, SpeciesId};
use pkmn::prng::Prng;
use pkmn::{Battle, Dex, Event, Outcome, PokemonSet, SideId};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let battles: u64 = arguments.next().map_or(Ok(1_000), |count| count.parse())?;
    let log = arguments.any(|argument| argument == "--log");
    let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON)?);
    let names = Names::new(&dex);
    let setups: Vec<[Vec<PokemonSet>; 2]> = (0..battles)
        .map(|seed| {
            let mut prng = Prng::new(seed ^ 0x9E37_79B9_7F4A_7C15);
            [names.random_team(&mut prng), names.random_team(&mut prng)]
        })
        .collect();

    let started = Instant::now();
    let mut steps = 0_u64;
    let mut wins = [0_u64; 2];
    let mut options = Vec::with_capacity(16);
    for (seed, teams) in (0..battles).zip(&setups) {
        let mut prng = Prng::new(seed);
        let mut battle = Battle::new(Arc::clone(&dex), [&teams[0], &teams[1]], seed)?;
        if log {
            print_events(&dex, battle.events());
        }
        while battle.outcome().is_none() {
            let choices = SideId::BOTH.map(|side| {
                options.clear();
                options.extend(battle.choices(side));
                pick(&options, &mut prng)
            });
            let events = battle.submit(choices)?;
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
        "{battles} battles, {steps} steps in {elapsed:.3}s: {:.0} battles/s, {:.0} steps/s (P1 {} / P2 {})",
        per_second(battles),
        per_second(steps),
        wins[0],
        wins[1],
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
    }
}

fn side_name(side: SideId) -> &'static str {
    match side {
        SideId::P1 => "P1",
        SideId::P2 => "P2",
    }
}

fn describe(dex: &Dex, event: &Event) -> String {
    match *event {
        Event::Turn { turn } => format!("\n== Turn {turn} =="),
        Event::Switch {
            side,
            species,
            hp,
            max_hp,
            ..
        } => format!(
            "{} sent out {} ({hp}/{max_hp})",
            side_name(side),
            dex.species(species).name
        ),
        Event::Move { side, move_id } => {
            format!("{} used {}!", side_name(side), dex.move_data(move_id).name)
        }
        Event::Prepare { side, move_id } => {
            format!(
                "{} is charging {}!",
                side_name(side),
                dex.move_data(move_id).name
            )
        }
        Event::Terastallize { side, tera_type } => format!(
            "{} Terastallized into {}!",
            side_name(side),
            dex.type_data(tera_type).name
        ),
        Event::Cant { side, reason } => format!("{} can't move: {reason:?}", side_name(side)),
        Event::Miss { side } => format!("{}'s attack missed!", side_name(side)),
        Event::Fail { .. } => "But it failed!".to_owned(),
        Event::Immune { side } => format!("It doesn't affect {}...", side_name(side)),
        Event::Crit { .. } => "A critical hit!".to_owned(),
        Event::SuperEffective { .. } => "It's super effective!".to_owned(),
        Event::Resisted { .. } => "It's not very effective...".to_owned(),
        Event::Damage {
            side,
            amount,
            hp,
            from,
        } => format!(
            "{} lost {amount} HP{} ({hp} left)",
            side_name(side),
            damage_source(dex, from)
        ),
        Event::Heal {
            side,
            amount,
            hp,
            from,
        } => format!(
            "{} restored {amount} HP{} ({hp} now)",
            side_name(side),
            heal_source(dex, from)
        ),
        Event::HitCount { hits } => format!("Hit {hits} time(s)!"),
        Event::Ability { side, ability } => {
            format!("[{}'s {}]", side_name(side), dex.ability(ability).name)
        }
        Event::Item { side, item } => format!("[{}'s {}]", side_name(side), dex.item(item).name),
        Event::EndItem { side, item } => {
            format!("{} used up its {}", side_name(side), dex.item(item).name)
        }
        Event::Faint { side } => format!("{} fainted!", side_name(side)),
        Event::Win { side } => format!("\n{} wins!", side_name(side)),
        Event::Tie => "\nIt's a tie!".to_owned(),
        _ => describe_condition_event(dex, event),
    }
}

/// Statuses, volatile statuses, stat stages, weather, terrain, and side conditions.
fn describe_condition_event(dex: &Dex, event: &Event) -> String {
    match *event {
        Event::Status { side, status } => format!("{} got {}!", side_name(side), status.id()),
        Event::CureStatus { side, status } => {
            format!("{} is cured of {}", side_name(side), status.id())
        }
        Event::Start { side, volatile } => format!("{} gained {volatile:?}!", side_name(side)),
        Event::Activate { side, volatile } => {
            format!("{} is affected by {volatile:?}...", side_name(side))
        }
        Event::End { side, volatile } => format!("{}'s {volatile:?} ended.", side_name(side)),
        Event::Boost { side, stat, stages } => {
            format!("{}'s {stat:?} changed by {stages:+}", side_name(side))
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
