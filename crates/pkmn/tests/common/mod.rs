//! Helpers shared by the integration tests.

use std::sync::Arc;

use pkmn::battle::DamageCause;
use pkmn::{Battle, BattleState, Choice, Dex, Event, PokemonSet, SideId};

pub const P1: SideId = SideId::P1;
pub const P2: SideId = SideId::P2;

pub fn dex() -> Arc<Dex> {
    Arc::new(Dex::from_json(pkmn::SAMPLE_DEX_JSON).expect("the sample dex compiles"))
}

pub fn set(species: &str, moves: &[&str]) -> PokemonSet {
    PokemonSet::new(species, moves)
}

pub fn start(p1: &[PokemonSet], p2: &[PokemonSet], seed: u64) -> Battle {
    Battle::new(dex(), [p1, p2], seed).expect("the teams are valid")
}

pub fn edit(battle: Battle, change: impl FnOnce(&mut BattleState)) -> Battle {
    let dex = Arc::new(battle.dex().clone());
    let mut state = battle.into_state();
    change(&mut state);
    Battle::from_state(dex, state).expect("the edited state is valid")
}

pub fn play(battle: &mut Battle, p1: Choice, p2: Choice) -> Vec<Event> {
    battle
        .submit([p1, p2])
        .expect("the choices are valid")
        .to_vec()
}

pub fn movers(events: &[Event]) -> Vec<SideId> {
    events
        .iter()
        .filter_map(|event| match event {
            Event::MoveUsed { side, .. } => Some(*side),
            _ => None,
        })
        .collect()
}

pub fn damage_to(events: &[Event], target: SideId, wanted: DamageCause) -> Vec<u16> {
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

pub fn max_hp(battle: &Battle, side: SideId) -> u16 {
    battle.state().active(side).max_hp()
}
