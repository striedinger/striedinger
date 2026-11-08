# pkmn

A deterministic, data-driven battle engine that follows the main series' Generation 9 singles mechanics. It has no I/O and no UI. You give it choices, it returns events, and any frontend (web through WASM, desktop, terminal, bots, AI search) can render them.

```sh
cargo test -p pkmn
cargo run --release -p pkmn --example simulate -- 10000   # throughput
cargo run -p pkmn --example simulate -- 1 --log           # one narrated battle
```

## Design

- **Content is data.** Types, the type chart, weather, species, and moves live in a JSON `DexSource` that refers to everything by name. `Dex::from_json` checks it (it rejects unknown fields, unknown references, duplicate names, and impossible values) and compiles it to numeric IDs, so a turn never looks up a string. `data/sample.json` is a small original pack with the standard 18-type chart and works as a template.
- **Move behavior is composed.** A move combines data fields (power, accuracy, priority, crit stage, multi-hit range, drain, recoil) with a list of effects: `boost`, `status`, `confuse`, `flinch`, `weather`, and `heal`, each with an optional chance and recipient. New moves usually need no code.
- **Battles are deterministic values.** `BattleState` holds the whole battle, including the seeded RNG (the Generation 5+ 64-bit LCG). You can clone it, serialize it with serde, and restore it with `Battle::from_state` to replay, save, sync over a network, or run a tree search.
- **Choices in, events out.** `Battle::request` says what each side must decide (`Turn`, `Replace`, or `Wait`). `Battle::submit` validates both choices and then resolves them, and changes nothing if either choice is invalid. It returns `Event`s that frontends turn into text or animation.

## Mechanics covered

- Generation 3+ stat formulas, natures, IVs, and EVs; stat stages, plus accuracy and evasion stages.
- The Generation 5+ damage formula, in the games' order with their rounding: 4096-based modifiers, weather, crits (×1.5, Generation 7+ odds), 85–100% damage rolls, STAB, dual-type effectiveness, and burn.
- Turn order: switches go first, then priority, then speed (paralysis halves it). Ties are random, and speed is re-read after every action.
- Statuses with their Generation 9 durations and immunities: burn, paralysis, poison, toxic, sleep (1–3 turns), and freeze (20% thaw chance, and Fire moves thaw the target). Also confusion (2–5 turns, 33% self-hit) and flinch.
- Weather defined as data: damage modifiers, residual damage, defensive boosts, and statuses it prevents.
- Multi-hit (35/35/15/15 for 2–5 hits), drain, recoil, Struggle, forced replacements, and the Generation 5+ rule that a side whose creature faints last in a double KO wins.

## Not yet

Abilities, held items, entry hazards, screens, terrain, Terastallization, two-turn and locking moves, switch-forcing moves, doubles, learnset validation, and differential testing against a reference simulator. Abilities and items will hook into the same effect system, with native handlers for the unusual ones.
