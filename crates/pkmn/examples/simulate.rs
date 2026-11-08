//! Plays random battles with the sample content and reports throughput.
//!
//! ```sh
//! cargo run --release -p pkmn --example simulate -- 10000
//! cargo run -p pkmn --example simulate -- 1 --log
//! ```

use std::sync::Arc;
use std::time::Instant;

use pkmn::battle::{DamageCause, HealCause, TraitRef};
use pkmn::dex::{AbilityId, ItemId, MoveId, SpeciesId};
use pkmn::prng::Prng;
use pkmn::{Battle, Choice, Dex, Event, Outcome, PokemonSet, Request, SideId};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut arguments = std::env::args().skip(1);
    let battles: u64 = arguments.next().map_or(Ok(1_000), |count| count.parse())?;
    let log = arguments.any(|argument| argument == "--log");
    let dex = Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON)?);

    let started = Instant::now();
    let mut turns = 0_u64;
    let mut wins = [0_u64; 2];
    for seed in 0..battles {
        let mut prng = Prng::new(seed ^ 0x9E37_79B9_7F4A_7C15);
        let teams = [random_team(&dex, &mut prng), random_team(&dex, &mut prng)];
        let mut battle = Battle::new(Arc::clone(&dex), [&teams[0], &teams[1]], seed)?;
        if log {
            print_events(&dex, battle.events());
        }
        while battle.outcome().is_none() {
            let choices = SideId::BOTH.map(|side| random_choice(&battle, side, &mut prng));
            let events = battle.submit(choices)?;
            if log {
                print_events(&dex, events);
            }
            turns += 1;
        }
        if let Some(Outcome::Winner(side)) = battle.outcome() {
            wins[side.index()] += 1;
        }
    }
    let elapsed = started.elapsed().as_secs_f64();
    println!(
        "{battles} battles, {turns} steps in {elapsed:.3}s: {:.0} battles/s, {:.0} steps/s (P1 {} / P2 {})",
        f64::from(u32::try_from(battles).unwrap_or(u32::MAX)) / elapsed,
        f64::from(u32::try_from(turns).unwrap_or(u32::MAX)) / elapsed,
        wins[0],
        wins[1],
    );
    Ok(())
}

fn pick<T: Copy>(options: &[T], prng: &mut Prng) -> T {
    let length = u32::try_from(options.len()).expect("few options");
    options[usize::try_from(prng.below(length)).expect("index fits")]
}

fn random_team(dex: &Dex, prng: &mut Prng) -> Vec<PokemonSet> {
    let move_names: Vec<&str> = (0..dex.move_count())
        .filter_map(|index| u16::try_from(index).ok())
        .map(|index| dex.move_data(MoveId(index)).name.as_str())
        .filter(|&name| name != "Struggle")
        .collect();
    let species: Vec<u16> = (0..dex.species_count())
        .filter_map(|index| u16::try_from(index).ok())
        .collect();
    (0..6)
        .map(|_| {
            let mut moves = Vec::new();
            while moves.len() < 4 {
                let name = pick(&move_names, prng);
                if !moves.contains(&name) {
                    moves.push(name);
                }
            }
            let mut set =
                PokemonSet::new(&dex.species(SpeciesId(pick(&species, prng))).name, &moves);
            if let Some(ability) = random_name(prng, dex.ability_count(), |id| {
                &dex.ability(AbilityId(id)).name
            }) {
                set = set.with_ability(ability);
            }
            if let Some(item) = random_name(prng, dex.item_count(), |id| &dex.item(ItemId(id)).name)
            {
                set = set.with_item(item);
            }
            set
        })
        .collect()
}

/// Picks a random name from a table of `count` entries, or none a third of the time.
fn random_name<'a>(
    prng: &mut Prng,
    count: usize,
    name: impl Fn(u16) -> &'a str,
) -> Option<&'a str> {
    let count = u32::try_from(count).ok().filter(|&count| count > 0)?;
    if prng.chance(1, 3) {
        return None;
    }
    u16::try_from(prng.below(count)).ok().map(name)
}

fn random_choice(battle: &Battle, side: SideId, prng: &mut Prng) -> Choice {
    match battle.request(side) {
        Some(Request::Turn {
            moves,
            switches,
            must_struggle,
        }) => {
            let mut options: Vec<Choice> = moves
                .iter()
                .filter(|option| !option.disabled)
                .map(|option| Choice::Move(option.slot))
                .collect();
            if must_struggle {
                options.push(Choice::Struggle);
            }
            // Switch rarely so battles look like battles rather than musical chairs.
            if options.is_empty() || prng.chance(1, 10) {
                options.extend(switches.into_iter().map(Choice::Switch));
            }
            pick(&options, prng)
        }
        Some(Request::Replace { switches }) => Choice::Switch(pick(&switches, prng)),
        Some(Request::Wait) | None => Choice::Pass,
    }
}

fn print_events(dex: &Dex, events: &[Event]) {
    for event in events {
        println!("{}", describe(dex, event));
    }
}

fn describe(dex: &Dex, event: &Event) -> String {
    let trait_name = |source: &TraitRef| match source {
        TraitRef::Ability(id) => dex.ability(*id).name.as_str(),
        TraitRef::Item(id) => dex.item(*id).name.as_str(),
    };
    let side = |side: &SideId| match side {
        SideId::P1 => "P1",
        SideId::P2 => "P2",
    };
    match event {
        Event::TurnStarted { turn } => format!("\n== Turn {turn} =="),
        Event::SwitchedIn {
            side: who,
            species,
            hp,
            max_hp,
            ..
        } => format!(
            "{} sent out {} ({hp}/{max_hp})",
            side(who),
            dex.species(*species).name
        ),
        Event::MoveUsed { side: who, move_id } => {
            format!("{} used {}!", side(who), dex.move_data(*move_id).name)
        }
        Event::CantMove { side: who, reason } => format!("{} can't move: {reason:?}", side(who)),
        Event::Missed { side: who } => format!("{}'s attack missed!", side(who)),
        Event::Failed { .. } => "But it failed!".to_owned(),
        Event::Immune { side: who } => format!("It doesn't affect {}...", side(who)),
        Event::CriticalHit { .. } => "A critical hit!".to_owned(),
        Event::SuperEffective { .. } => "It's super effective!".to_owned(),
        Event::NotVeryEffective { .. } => "It's not very effective...".to_owned(),
        Event::Damaged {
            side: who,
            amount,
            hp,
            cause,
        } => {
            let source = match cause {
                DamageCause::Move => String::new(),
                DamageCause::Trait(source) => format!(" from {}", trait_name(source)),
                other => format!(" from {other:?}"),
            };
            format!("{} lost {amount} HP{source} ({hp} left)", side(who))
        }
        Event::Healed {
            side: who,
            amount,
            hp,
            cause,
        } => {
            let source = match cause {
                HealCause::Drain => " by draining".to_owned(),
                HealCause::Move => String::new(),
                HealCause::Trait(source) => format!(" from {}", trait_name(source)),
            };
            format!("{} restored {amount} HP{source} ({hp} now)", side(who))
        }
        Event::HitCount { hits } => format!("Hit {hits} time(s)!"),
        Event::StatusInflicted { side: who, status } => format!("{} got {status:?}!", side(who)),
        Event::StatusCured { side: who, status } => {
            format!("{} is no longer affected by {status:?}", side(who))
        }
        Event::ConfusionStarted { side: who } => format!("{} became confused!", side(who)),
        Event::ConfusionActivated { side: who } => format!("{} is confused...", side(who)),
        Event::ConfusionEnded { side: who } => format!("{} snapped out of confusion!", side(who)),
        Event::StatChanged {
            side: who,
            stat,
            stages,
        } => format!("{}'s {stat:?} changed by {stages:+}", side(who)),
        Event::WeatherStarted { weather } => format!("{} began.", dex.weather(*weather).name),
        Event::WeatherEnded { weather } => format!("{} ended.", dex.weather(*weather).name),
        Event::TraitActivated { side: who, source } => {
            format!("[{}'s {}]", side(who), trait_name(source))
        }
        Event::ItemConsumed { side: who, item } => {
            format!("{} used up its {}", side(who), dex.item(*item).name)
        }
        Event::Fainted { side: who } => format!("{} fainted!", side(who)),
        Event::BattleEnded { outcome } => format!("\nBattle over: {outcome:?}"),
    }
}
