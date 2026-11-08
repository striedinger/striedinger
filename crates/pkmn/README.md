# pkmn

A deterministic, data-driven battle engine that follows the main series' Generation 9 singles mechanics. It has no I/O and no UI. You give it choices, it returns events, and any frontend (web through WASM, desktop, terminal, bots, AI search) can render them.

```sh
cargo test -p pkmn
cargo run --release -p pkmn --example simulate -- 10000   # throughput
cargo run -p pkmn --example simulate -- 1 --log           # one narrated battle
```

## Design

- **Content is data.** Types, the type chart, weather, species, moves, abilities, and items live in a JSON `DexSource` that refers to everything by name. `Dex::from_json` checks it (it rejects unknown fields, unknown references, duplicate names, and impossible values) and compiles it to numeric IDs, so a turn never looks up a string. `data/sample.json` is a small original pack with the standard 18-type chart and works as a template.
- **Move behavior is composed.** A move combines data fields (power, accuracy, priority, crit stage, multi-hit range, drain, recoil, contact) with a list of effects: `boost`, `status`, `confuse`, `flinch`, `weather`, and `heal`, each with an optional chance and recipient. New moves usually need no code.
- **Abilities and items are composed too.** Both are "traits": a name plus effects from one vocabulary.
  - Conditional modifiers for stats, base power, STAB, and damage dealt or taken. Conditions can be move type, category, HP threshold, full HP, statused, weather, or super-effective.
  - Type immunities and absorption, and status immunities.
  - Effects on entering battle: weather, or a stat change to the opponent.
  - Reactions to contact: a status or damage to the attacker.
  - End-of-turn healing and boosts.
  - Choice locking, a ban on status moves, enduring a hit from full HP, threshold berries, status cures, and recoil after attacking.
  - Items can be `consumable`.
- **Battles are deterministic values.** `BattleState` holds the whole battle, including the seeded RNG (the Generation 5+ 64-bit LCG). You can clone it, serialize it with serde, and restore it with `Battle::from_state` to replay, save, sync over a network, or run a tree search.
- **Choices in, events out.** `Battle::request` says what each side must decide (`Turn`, `Replace`, or `Wait`). `Battle::submit` validates both choices and then resolves them, and changes nothing if either choice is invalid. It returns `Event`s that frontends turn into text or animation.

## Mechanics covered

- Generation 3+ stat formulas, natures, IVs, and EVs; stat stages, plus accuracy and evasion stages.
- The Generation 5+ damage formula, in the games' order with their rounding.
  - Base power, attack, defense, and final damage modifiers are chained in 4096 fixed point.
  - Then weather, crits (×1.5, Generation 7+ odds), 85–100% damage rolls, STAB, dual-type effectiveness, and burn.
- Turn order: switches go first, then priority, then speed. Speed includes trait modifiers, paralysis halves it, and it's capped at 10000. Ties are random, and speed is re-read after every action.
- Statuses with their Generation 9 durations and immunities:
  - burn, paralysis, poison, and toxic;
  - sleep (1–3 turns);
  - freeze (20% thaw chance; Fire moves thaw the target);
  - confusion (2–5 turns, 33% self-hit) and flinch.
- Weather defined as data: damage modifiers, residual damage, defensive boosts, and statuses it prevents.
- Multi-hit (35/35/15/15 for 2–5 hits), drain, recoil, Struggle, and forced replacements.
- End-of-turn effects in residual order: weather, then healing items, poison, burn, and end-of-turn boosts. Faints are checked after each one, so a battle can end partway through the end of a turn.
- The Generation 5+ rule that in a double KO, the side whose creature fainted last wins.

## Faithfulness to Pokémon Showdown

The engine follows Pokémon Showdown's Generation 9 simulator, including where and how often it draws random numbers. Both seed the same 64-bit LCG, so they can be compared roll for roll:

- Every secondary effect consumes a roll, even at 100%.
- Unconditional self effects of a damaging move share one roll and apply before the secondaries.
- Healing moves round half up, and drain has no minimum.
- Contact traits and thawing react after the secondaries.
- Berries check at Showdown's "update" points.

`oracle/` is a pnpm workspace package that records reference battles from Showdown into `tests/fixtures/showdown.json`:

1. It injects this crate's sample pack into Showdown's data tables.
2. It maps each sample ability and item to the Showdown trait it reproduces.
3. It plays seeded random 3v3 battles.

`tests/showdown.rs` replays those battles and requires identical stats, HP, statuses, items, active slots, stat stages, weather, turn, and winner after every step. Showdown draws extra random numbers whenever the active creatures are speed-tied, so a recording stops at a battle's first speed tie.

```sh
pnpm install
pnpm --filter @workspace/pkmn-oracle generate   # writes tests/fixtures/showdown.json
cargo test -p pkmn --test showdown
```

Until the recording exists, the replay test skips with a message. Regenerate the recording after changing mechanics or the sample pack.

## Not yet

Entry hazards, screens, terrain, Terastallization, two-turn and locking moves, switch-forcing moves, doubles, and learnset validation.
