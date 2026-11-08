# pkmn

A deterministic, data-driven battle engine that follows the main series' Generation 9 singles, doubles, triples and free-for-all mechanics, with Pokémon Showdown as its reference. It has no I/O and no UI. You give it choices, it returns events, and any frontend (web through WASM, desktop, terminal, bots, AI search) can render them.

```sh
cargo test -p pkmn
pnpm --filter @workspace/pkmn-oracle generate             # record Showdown battles for tests/showdown.rs
pnpm --filter @workspace/pkmn-oracle generate -- --doubles # and doubles battles
pnpm --filter @workspace/pkmn-oracle generate -- --triples # and triples battles
pnpm --filter @workspace/pkmn-oracle generate -- --free-for-all # and free-for-all battles
cargo run --release -p pkmn --example simulate -- 20000   # throughput
cargo run -p pkmn --example simulate -- 1 --log           # one narrated battle
cargo run --release -p pkmn --example simulate -- 20000 --doubles
cargo run --release -p pkmn --example simulate -- 20000 --triples
cargo run --release -p pkmn --example simulate -- 20000 --free-for-all
```

## Terminology

Names follow Pokémon Showdown, which follows the games, so its documentation and data apply directly. Rust identifiers spell words out (`Stat::SpecialAttack`, `Status::Burn`), and serialized names use Showdown's IDs (`spa`, `brn`).

| Concept              | Data format                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Rust                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Base stats, EVs, IVs | `baseStats`, `evs`, `ivs` with `hp` `atk` `def` `spa` `spd` `spe`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `StatTable`                                 |
| Stat stages          | `boosts: {"atk": 2}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Boosts`, `BoostStat`                       |
| Type chart           | `damageTaken` per type: 1 weak, 2 resists, 3 immune; also status IDs and weather names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `TypeData`                                  |
| Statuses             | `brn` `par` `psn` `tox` `slp` `frz`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `Status`, `StatusState` (`time`, `stage`)   |
| Volatile statuses    | `volatileStatus`: `confusion`, `flinch`, `protect`, `substitute`, `followme`, `helpinghand`; `self.volatileStatus: "lockedmove"`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `VolatileStatus`, `Volatiles`, `LockedMove` |
| Moves                | `basePower`, `accuracy` (number or `true`), `critRatio`, `multihit`, `drain`, `recoil`, `struggleRecoil`, `flags` (`contact`, `protect`, `charge`, `bypasssub`, `metronome`, `nosleeptalk`, `failcopycat`), `ignoreImmunity`, `stallingMove`, `selfSwitch`, `forceSwitch`, `chargeBoosts`, `chargeSkippedIn`, `semiInvulnerable`, `terrain`, `clearSideConditions`, `clearTerrain`, `substituteBlocksBoosts`, `calls` (`random` / `ownMove` / `lastMove`), `sleepUsable`, `target` (`normal` / `self` / `foeSide` / `allySide` / `allAdjacentFoes` / `allAdjacent` / `randomNormal`) | `MoveData`                                  |
| Move effects         | primary `boosts` / `status` / `volatileStatus` / `weather` / `heal`, `self`, `secondaries`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `MoveEffect`, `Secondary`                   |
| Abilities and items  | `handlers` named after Showdown events: `modifyStat`, `basePower`, `modifyDamage`, `sourceModifyDamage`, `modifyStab`, `immunity`, `absorb`, `statusImmunity`, `startWeather`, `startFoeBoosts`, `contactStatus`, `contactDamage`, `residualHeal`, `residualBoosts`, `choiceLock`, `disableStatusMoves`, `endureFromFull`, `healAtThreshold`, `cureStatus`, `afterMoveRecoil`                                                                                                                                                                                                        | `Handler`, `AbilityData`, `ItemData`        |
| Side conditions      | `sideConditions`: `switchInDamage` (hazard `layers`, type-scaled `type`, `groundedType`), `damageModifier` (screens, with `doublesModifier`), `blocksSpreadMoves` (Wide Guard), `duration`, `residualOrder`, `residualSubOrder`; set by a move's `sideCondition`                                                                                                                                                                                                                                                                                                                     | `SideConditionData`, `SideConditionState`   |
| Terrain              | `terrains`: `groundedType`, `basePowerModifiers`, `targetBasePowerModifiers`, `residualHeal`, `preventsStatuses`, `preventsVolatiles`, `blocksPriority`, `moveBasePowerModifiers`, `duration`                                                                                                                                                                                                                                                                                                                                                                                        | `TerrainData`, `TerrainState`               |
| Sets                 | `PokemonSet`: `species`, `item`, `ability`, `moves`, `nature`, `evs`, `ivs`, `level`, `teraType` (a type or `Stellar`)                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `PokemonSet`                                |
| Learnsets            | a species' `learnset`: move name to sources such as `"9L15"` (level-up), `"9M"`, `"9T"`, `"9E"`, `"9S0"`; `abilities` by slot (`0`, `1`, `H`, `S`); `prevo` and `evoLevel`                                                                                                                                                                                                                                                                                                                                                                                                           | `LearnSource`, `PokemonSet::validate`       |
| Positions            | `p1a` to `p1c`, `p2a` to `p2c`, and `p3a` and `p4a` in free-for-all; `gameType` `singles`, `doubles`, `triples` or `freeforall`; target locations 1 to 3 for the other half of the field, -1 to -3 for the user's half                                                                                                                                                                                                                                                                                                                                                               | `Position`, `GameType`                      |
| Requests and choices | per position: move request (moves with their `target`, `canTerastallize`), `forceSwitch` (for a fainted creature or a mid-turn `switchFlag`), `wait`; `move N`, `move N T`, `move N terastallize`, `switch N`, `shift` (triples), `pass`                                                                                                                                                                                                                                                                                                                                             | `Request`, `Choice`                         |
| Events               | protocol messages, each creature named by its position: `switch`, `move`, `cant`, `-damage`, `-heal`, `-status`, `-boost`, `-weather`, `-ability`, `-item`, `-enditem`, `faint`, `win`, ...                                                                                                                                                                                                                                                                                                                                                                                          | `Event`                                     |
| End of turn          | residual handlers, then `Update`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `residual`, `update`                        |

## Design

- **Content is data.** A JSON `DexSource` refers to everything by name. `Dex::from_json` checks it (it rejects unknown fields, unknown references, duplicate names, and impossible values) and compiles it to numeric IDs, so a turn never looks up a string. `data/sample.json` is a small original pack with the standard 18-type chart, four weathers, the 25 natures, and original species, moves, abilities, items, entry hazards, and screens. Use it as a template.
- **Effects say how they roll.** As in Showdown, primary effects apply without a roll. `self` boosts the user after one shared roll. Each secondary rolls its own chance, even at 100%.
- **Abilities and items are handlers.** Most new ones are a list of handlers rather than code. Each ability and item compiles to a bitmask of its handler kinds, so a creature without a relevant handler adds no cost to a check.
- **Battles are deterministic values.** `BattleState` holds the whole battle, including the seeded RNG (the Generation 5+ 64-bit LCG, also used by Showdown's `gen5` seeds). Clone it, serialize it with serde, and restore it with `Battle::from_state` to replay, save, sync over a network, or run a tree search.
- **Choices in, events out.**
  - `Battle::new` starts a singles battle, `Battle::doubles` a doubles battle, `Battle::triples` a triples battle and `Battle::free_for_all` a free-for-all among four sides.
  - `Battle::request` describes a position's decision as Showdown would; a side stands for its first position.
  - `Battle::choices` lists a position's legal choices without allocating.
  - `Battle::submit` (singles), `Battle::submit_doubles`, `Battle::submit_free_for_all` and `Battle::submit_all` (any game type) validate every choice and resolve them, changing nothing if any is invalid.
- **Legality is separate from simulation.** As with Showdown's `TeamValidator` and simulator, `Battle::new` checks only that a set can exist, and `PokemonSet::validate` also checks the species' ability, evolution level, and learnset. A species learns what its pre-evolutions learn. A level-up move needs the set to be at least that level, unless the line learns it another way. A species without a learnset may use any move, and one without abilities any ability.

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
- Protect: fails if the user moves last, and consecutive uses succeed with chance 1/3, 1/9, and so on, up to 1/729 (Showdown's `stall`). It blocks moves with the `protect` flag.
- Substitute: costs 1/4 of max HP and absorbs hits. Hits on it skip the target's secondaries and contact handlers, though the rolls still happen. Status moves aimed at it fail.
- Entry hazards land on switch-in, before abilities:
  - scaled by type, like Stealth Rock;
  - or stacking up to three layers on grounded creatures only, like Spikes.
- Screens multiply non-critical damage of one category for five turns, ending at residual order 26.
- Terrain, like weather, is data. It applies only to grounded creatures and lasts five turns, ending at residual order 27. It can:
  - boost a grounded attacker's type (×5325/4096);
  - weaken a type against grounded targets;
  - change particular moves' power, needing either the user or the target on the ground, like Grassy Terrain halving Earthquake;
  - heal grounded creatures at residual order 5, before items;
  - prevent statuses and confusion;
  - block priority moves.
- Charging moves (`flags.charge`) spend a turn preparing unless the weather skips it, then are forced next turn without spending PP. Optional: boosts while charging, and semi-invulnerability, where every move aimed at the charger misses.
- Rampages (`self.volatileStatus: "lockedmove"`) roll 2–3 turns and follow Showdown's two counters. The user can't switch out, and ends confused if the rampage runs its course; sleep ends it quietly.
- `forceSwitch` moves drag out a random replacement from Showdown's `possibleSwitches` order. pkmn tracks that order, which swaps on every switch, so the random pick matches. The dragged-out creature's queued move is cancelled. With nothing to drag in, status forcing moves fail.
- `clearSideConditions` and `clearTerrain` remove hazards, screens, and terrain. Damaging moves clear after each hit, before recoil, like Rapid Spin (also after hitting a substitute); status moves clear as their effect, like Defog.
- Terastallization (`move N terastallize`) happens after switches and before moves (Showdown's queue order 106), once per side per battle.
  - The Tera type becomes the creature's only type for defense.
  - Original types keep STAB; a matching Tera type gives ×2. An Adaptability-style `modifyStab` applies only to the current types, and its `teraModifier` (×2.25 for Adaptability) replaces the ×2.
  - Weak non-priority, single-hit Tera-type moves are raised to 60 base power.
  - Stellar keeps the creature's own types. The first move of each type gets ×2 with STAB, or ×4915/4096 without, for every hit of that use. Stellar skips `modifyStab`. Its 60-power floor applies to types not yet boosted, and the boosted types are remembered through switches.
- Calling moves use another move without its PP or pre-move checks, and the called move takes the caller's priority:
  - `random` picks any move with the `metronome` flag, like Metronome;
  - `ownMove` picks one of the user's other moves, but not `nosleeptalk` or `charge` ones. It works only while asleep, like Sleep Talk (`sleepUsable` moves can be used asleep);
  - `lastMove` copies the last move anyone used, unless it is `failcopycat`, like Copycat.

  A called move that charges or rampages locks the user in, and the user then chooses it as move slot 0 if it isn't in the moveset. A Choice item's lock makes any other move fail, even a forced one.

- Self-switching moves like U-turn pause the turn for the user's replacement. The rest of the turn waits in `BattleState::queue`, so a battle saved mid-turn resumes exactly.
- Residual effects are sorted exactly as Showdown sorts them. That covers order, speed and sub-order, and effects that only count down a duration, like Protect or a screen. Tied handlers are shuffled with the same random draws, and faints are checked after each handler, so a battle can end partway through.
- Switch-ins run each creature's entry hazards, ability and item in speed order, with a faint check after each.
- Fainting clears stat stages, volatiles and Terastallization, as Showdown's `faintMessages` does.
- The Generation 5+ rule that in a double KO, the side whose creature fainted last wins.
- Doubles, as in Showdown's `gen9doublescustomgame`:
  - Aimed moves take a target location, at either foe or the ally. A chosen foe that faints is replaced by a random one, while a fainted ally stays the target and the move fails.
  - Spread moves (`allAdjacentFoes`, `allAdjacent`) deal ×0.75 to each target and strike across targets step by step: substitutes first, then the rest, then effects, secondaries and contact.
  - Four actions are ordered by switching, priority and speed, re-read before each move. Residuals, `Update`, switch-ins and Terastallization run over every position in speed order.
  - Showdown resolves a move's target whenever it reads the queue: when a choice is queued, before every move, and when the move runs. A move that falls back to a random foe (spread, side, and `randomNormal` moves, or one aimed at a fainted foe) draws each time, and pkmn draws the same.
  - Intimidate-style abilities hit every foe, screens use their `doublesModifier`, and replacements, forced switches and self-switching moves work per position.
  - Follow Me (`volatileStatus: "followme"`) draws the foes' single-target moves, even ones aimed at its ally, except on a charging turn; it fails in singles.
  - Helping Hand (`volatileStatus: "helpinghand"`, target `adjacentAlly`) multiplies the ally's base power by 1.5 (2.25 twice), after items and abilities and before terrain. It fails unless the ally still moves this turn or has just switched in.
  - Wide Guard (a `guard` move setting a side condition with `blocksSpreadMoves`) blocks spread moves with the `protect` flag at its side, allies' included, for the turn. Like Protect it fails if the user moves last and builds the stall counter (even when already up), though it never rolls against it.
- Triples, as Showdown plays them (it has no Generation 9 triples custom game, so the oracle runs the doubles one's rules with three positions a side):
  - Positions are adjacent to their neighbours and to the foes across and diagonally across, so the edges cannot reach each other. Aimed moves, spread moves, Intimidate-style abilities, Follow Me and Helping Hand reach only adjacent positions. A single-target move with no target picks a random adjacent foe, or aims across when there is none.
  - An edge creature can `shift` to the center, at a move's priority 0 and its speed. It trades places, and its queued action, with the center. A move aimed at its own new location then has no target and fails.
  - Showdown re-sorts the queue after an action only when a move comes next in the old order, so a shift can run before speeds are read again; pkmn follows that order and its target redraws.
  - When each side has one creature left and they cannot reach each other, both move to the center at the start of the next turn.
- Free-for-all, as Showdown plays it (the oracle runs the singles custom game's rules with four players):
  - Four sides of one creature each, all foes of one another. Showdown lays them out as doubles, with `p1` and `p3` on one half of the field and `p2` and `p4` on the other, so a target location names a position as in doubles and every position is adjacent.
  - An aimed move may name a target or leave it out for a random foe. A target that faints stays the target, and the move fails. A move at an ally, like Helping Hand, may name anyone, and finds no one at random.
  - Spread moves deal ×0.5 to each target. A move at the foe's side, like a hazard, reaches every other side.
  - A side whose creatures are all out stays on the field, and the last side standing wins.

One deliberate difference: Showdown re-sorts the active creatures at every `Update`, every switch-in, and every speed-ordered event, so it rolls to break each speed tie between two creatures. pkmn rolls only where the order changes an outcome, which keeps those checkpoints cheap. The same goes for a fainted creature's ability and item, which Showdown keeps in the residual sort at its last speed. Battles without speed ties consume the same random numbers as Showdown. Speed-tied battles diverge from Showdown's from the first tie on. Doubles, triples and free-for-all have more ties, with more creatures on the field.

A second difference follows the games rather than Showdown. A rampage started by a calling move, like Outrage from Metronome, carries on in pkmn. Showdown aims its later turns at the caller's target, the user, so they fail.

## Differential testing

`apps/pkmn-oracle` plays seeded random singles, doubles, triples and free-for-all battles in Pokémon Showdown with the sample pack injected. pkmn's data format follows Showdown's, so species and moves go in almost unchanged. Names that Showdown implements in code are mapped to the Showdown effect they reproduce: abilities, items, weathers, terrains, side conditions, and the callbacks of moves like Protect or Rapid Spin.

The oracle writes every step's choices and the resulting state to `tests/fixtures/showdown.json` (and `showdown-doubles.json`, `showdown-triples.json` or `showdown-free-for-all.json` with `--doubles`, `--triples` or `--free-for-all`). The state covers HP, status, items, PP, each position's stat stages, Substitute, confusion and Tera, weather, terrain, side conditions and their durations, and the winner. `tests/showdown.rs` replays each battle through pkmn from the same seed and requires the same state after every step.

A recording stops at either documented difference above: a speed tie, or a rampage started by a calling move. The fixtures are generated, not committed, so CI records 2,000 battles of each on every run. Without the fixture, the test is skipped unless `PKMN_REQUIRE_SHOWDOWN` is set.

## Not yet

Multi battles, with two players on each side, and rotation battles.
