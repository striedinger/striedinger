# pkmn

A deterministic, data-driven battle engine that follows the main series' Generation 9 singles mechanics, with Pokémon Showdown as its reference. It has no I/O and no UI. You give it choices, it returns events, and any frontend (web through WASM, desktop, terminal, bots, AI search) can render them.

```sh
cargo test -p pkmn
cargo run --release -p pkmn --example simulate -- 20000   # throughput
cargo run -p pkmn --example simulate -- 1 --log           # one narrated battle
```

## Terminology

Names follow Pokémon Showdown, which follows the games, so its documentation and data apply directly. Rust identifiers spell words out (`Stat::SpecialAttack`, `Status::Burn`), and serialized names use Showdown's IDs (`spa`, `brn`).

| Concept              | Data format                                                                                                                                                                                                                                                                                                                                                                   | Rust                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Base stats, EVs, IVs | `baseStats`, `evs`, `ivs` with `hp` `atk` `def` `spa` `spd` `spe`                                                                                                                                                                                                                                                                                                             | `StatTable`                               |
| Stat stages          | `boosts: {"atk": 2}`                                                                                                                                                                                                                                                                                                                                                          | `Boosts`, `BoostStat`                     |
| Type chart           | `damageTaken` per type: 1 weak, 2 resists, 3 immune; also status IDs and weather names                                                                                                                                                                                                                                                                                        | `TypeData`                                |
| Statuses             | `brn` `par` `psn` `tox` `slp` `frz`                                                                                                                                                                                                                                                                                                                                           | `Status`, `StatusState` (`time`, `stage`) |
| Volatile statuses    | `volatileStatus: "confusion"` or `"flinch"`                                                                                                                                                                                                                                                                                                                                   | `VolatileStatus`, `Volatiles`             |
| Moves                | `basePower`, `accuracy` (number or `true`), `critRatio`, `multihit`, `drain`, `recoil`, `struggleRecoil`, `flags.contact`, `ignoreImmunity`, `target` (`normal` / `self`)                                                                                                                                                                                                     | `MoveData`                                |
| Move effects         | primary `boosts` / `status` / `volatileStatus` / `weather` / `heal`, `self`, `secondaries`                                                                                                                                                                                                                                                                                    | `MoveEffect`, `Secondary`                 |
| Abilities and items  | `handlers` named after Showdown events: `modifyStat`, `basePower`, `modifyDamage`, `sourceModifyDamage`, `modifyStab`, `immunity`, `absorb`, `statusImmunity`, `startWeather`, `startFoeBoosts`, `contactStatus`, `contactDamage`, `residualHeal`, `residualBoosts`, `choiceLock`, `disableStatusMoves`, `endureFromFull`, `healAtThreshold`, `cureStatus`, `afterMoveRecoil` | `Handler`, `AbilityData`, `ItemData`      |
| Sets                 | `PokemonSet`: `species`, `item`, `ability`, `moves`, `nature`, `evs`, `ivs`, `level`                                                                                                                                                                                                                                                                                          | `PokemonSet`                              |
| Requests and choices | move request, `forceSwitch`, `wait`; `move N`, `switch N`, `pass`                                                                                                                                                                                                                                                                                                             | `Request`, `Choice`                       |
| Events               | protocol messages: `switch`, `move`, `cant`, `-damage`, `-heal`, `-status`, `-boost`, `-weather`, `-ability`, `-item`, `-enditem`, `faint`, `win`, ...                                                                                                                                                                                                                        | `Event`                                   |
| End of turn          | residual handlers, then `Update`                                                                                                                                                                                                                                                                                                                                              | `residual`, `update`                      |

## Design

- **Content is data.** A JSON `DexSource` refers to everything by name. `Dex::from_json` checks it (it rejects unknown fields, unknown references, duplicate names, and impossible values) and compiles it to numeric IDs, so a turn never looks up a string. `data/sample.json` is a small original pack with the standard 18-type chart, four weathers, the 25 natures, and original species, moves, abilities, and items. Use it as a template.
- **Effects say how they roll.** As in Showdown, primary effects apply without a roll. `self` boosts the user after one shared roll. Each secondary rolls its own chance, even at 100%.
- **Abilities and items are handlers.** Most new ones are a list of handlers rather than code. Each ability and item compiles to a bitmask of its handler kinds, so a creature without a relevant handler adds no cost to a check.
- **Battles are deterministic values.** `BattleState` holds the whole battle, including the seeded RNG (the Generation 5+ 64-bit LCG, also used by Showdown's `gen5` seeds). Clone it, serialize it with serde, and restore it with `Battle::from_state` to replay, save, sync over a network, or run a tree search.
- **Choices in, events out.**
  - `Battle::request` describes the decision as Showdown would.
  - `Battle::choices` lists the legal choices without allocating.
  - `Battle::submit` validates both choices and resolves them, changing nothing if either is invalid.

## Mechanics covered

- Generation 3+ stats and natures; stat stages, including accuracy and evasion.
- The Generation 5+ damage formula, in Showdown's order with its rounding.
  - `BasePower`, `ModifyAtk`/`ModifyDef`, and `ModifyDamage` chains in 4096 fixed point.
  - Then weather, crits (Generation 7+ odds by `critRatio`), 85–100% rolls, STAB, dual-type effectiveness, and burn.
- Action order: switches, then priority, then speed (with modifiers and paralysis, capped at 10000 and compared in 13 bits). Ties are random, and speed is re-read after every action.
- Statuses, with Showdown's durations and immunities from `damageTaken`.
  - Sleep lasts 1–3 turns, and freeze has a 20% thaw chance each turn (Fire moves thaw the target).
  - Confusion lasts 2–5 turns with a 33% self-hit; flinch.
- Weather as data: damage modifiers, residual damage, defensive boosts, and prevented statuses.
- Multi-hit (35/35/15/15 for 2–5 hits), drain, recoil, Struggle, and forced switches.
- Residual effects in Showdown's order, with faints checked after each, so a battle can end partway through.
- The Generation 5+ rule that in a double KO, the side whose creature fainted last wins.

One deliberate difference: Showdown re-sorts the active creatures, and so rolls to break speed ties, at every `Update`, every switch-in, and each tied residual group. pkmn rolls only where the order changes an outcome, which keeps those checkpoints cheap. Battles without speed ties consume the same random numbers as Showdown. Speed-tied battles diverge from Showdown's from the first tie on.

## Not yet

Differential testing against a reference simulator, entry hazards, screens, terrain, Terastallization, two-turn and locking moves, switch-forcing moves, doubles, and learnset validation.
