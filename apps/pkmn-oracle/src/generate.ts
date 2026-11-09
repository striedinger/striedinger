/**
 * Records reference battles from Pokémon Showdown for pkmn's differential test.
 *
 * pkmn's content format follows Showdown's data files, so the sample pack's species and moves
 * are injected into Showdown's data tables almost unchanged. Names that Showdown implements in
 * code are mapped to the Showdown effect they are written to reproduce: abilities, items,
 * weathers, terrains, side conditions, and the callbacks of moves such as Protect or Rapid
 * Spin. Random battles then run from `gen5` seeds, which use the same 64-bit LCG as pkmn's
 * PRNG. Every step's choices and resulting state are written to
 * `crates/pkmn/tests/fixtures/showdown.json`, and `crates/pkmn/tests/showdown.rs` replays them
 * through pkmn and compares.
 *
 * Showdown draws extra random numbers whenever the two active creatures are speed-tied, a
 * documented difference, so a battle's recording stops at its first speed tie.
 *
 * Usage: pnpm --filter @workspace/pkmn-oracle generate [battles]
 *   [--doubles | --triples | --free-for-all]
 */

import type { Battle as ShowdownBattle, Pokemon, Side } from "pokemon-showdown";
import type { EffectState } from "pokemon-showdown/dist/sim/pokemon.js";
import type { PokemonSet as ShowdownSet } from "pokemon-showdown/dist/sim/teams.js";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import showdown from "pokemon-showdown";

const { Battle, Dex, Pokemon: ShowdownPokemon, toID } = showdown;

type StatName = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
type StatTable = Record<StatName, number>;
type Choice =
  | { move: number }
  | { terastallize: number }
  | { moveAt: [number, number] }
  | { terastallizeAt: [number, number] }
  | { switch: number }
  | "shift"
  | "pass";
type GameType = "singles" | "doubles" | "triples" | "freeforall";

interface SampleMove {
  name: string;
  type: string | null;
  basePower?: number;
  target?: string;
  priority?: number;
  flags?: Record<string, number>;
  stallingMove?: boolean;
  guard?: boolean;
  failsUnlessTargetAttacks?: boolean;
  failsAgainstType?: string;
  itemEffect?: string;
  selfSwitch?: boolean | string;
  clearUserVolatiles?: string[];
  calls?: string;
  weather?: string;
  terrain?: string;
  pseudoWeather?: string;
  sideCondition?: string;
  chargeBoosts?: unknown;
  chargeSkippedIn?: unknown;
  semiInvulnerable?: unknown;
  clearSideConditions?: unknown;
  clearTerrain?: unknown;
  [field: string]: unknown;
}

interface TerrainMoveModifier {
  move: string;
  modifier: [number, number];
  grounded: "user" | "target";
}

interface SampleDex {
  types: { name: string }[];
  terrains: { name: string; moveBasePowerModifiers?: TerrainMoveModifier[] }[];
  natures: { name: string }[];
  species: { name: string; types: string[]; baseStats: StatTable }[];
  moves: SampleMove[];
  abilities: { name: string }[];
  items: { name: string }[];
}

/** A set in pkmn's format, which is Showdown's `PokemonSet` with pkmn's content names. */
interface PokemonSet {
  name: string;
  species: string;
  item: string | null;
  ability: string | null;
  moves: string[];
  nature: string;
  evs: StatTable;
  ivs: StatTable;
  level: number;
  teraType: string;
}

interface Timed {
  name: string;
  duration: number | null;
}

interface PokemonSnapshot {
  hp: number;
  status: string | null;
  item: string | null;
  pp: number[];
}

interface PositionSnapshot {
  boosts: number[];
  substitute: number | null;
  confused: boolean;
  terastallized: boolean;
}

interface SideSnapshot {
  active: number[];
  team: PokemonSnapshot[];
  positions: PositionSnapshot[];
  conditions: (Timed & { layers: number })[];
}

interface Snapshot {
  turn: number;
  weather: Timed | null;
  terrain: Timed | null;
  pseudoWeathers: Timed[];
  winner: string | null;
  sides: SideSnapshot[];
}

interface RecordedBattle {
  gameType: GameType;
  seed: string;
  teams: PokemonSet[][];
  stats: StatTable[][];
  start: Snapshot;
  steps: { choices: Choice[][]; after: Snapshot }[];
  stopped: "finished" | "speed_tie" | "step_limit" | "called_rampage";
}

const TEAM_SIZE: Record<GameType, number> = { singles: 3, doubles: 4, triples: 5, freeforall: 3 };
/**
 * Showdown has no Gen 9 triples or free-for-all custom game, so triples plays the doubles
 * one's rules and free-for-all the singles one's.
 */
const FORMATS: Record<GameType, string> = {
  singles: "gen9customgame",
  doubles: "gen9doublescustomgame",
  triples: "gen9doublescustomgame",
  freeforall: "gen9customgame",
};
/** Showdown's `targetTypeChoices`: target types a doubles choice must aim. */
const AIMED_TARGETS = new Set([
  "normal",
  "any",
  "adjacentFoe",
  "adjacentAlly",
  "adjacentAllyOrSelf",
]);
const STEP_LIMIT = 300;
const STAT_NAMES: readonly StatName[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const BOOST_NAMES = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"] as const;
const SAMPLE = new URL("../../../crates/pkmn/data/sample.json", import.meta.url);
const FIXTURES = new URL("../../../crates/pkmn/tests/fixtures/", import.meta.url);

/** Showdown's weather condition for each sample weather. */
const WEATHERS: Record<string, string> = {
  Rain: "raindance",
  Sun: "sunnyday",
  Sandstorm: "sandstorm",
  Snow: "snowscape",
};
/** Showdown's terrain for each sample terrain. */
const TERRAINS: Record<string, string> = {
  "Charged Field": "electricterrain",
  Overgrowth: "grassyterrain",
  "Mist Field": "mistyterrain",
  "Mind Field": "psychicterrain",
};
/** Showdown's pseudo-weather for each sample pseudo-weather. */
const PSEUDO_WEATHERS: Record<string, string> = {
  "Twisted Room": "trickroom",
};
/** Showdown's side condition for each sample side condition. */
const SIDE_CONDITIONS: Record<string, string> = {
  "Jagged Stones": "stealthrock",
  Caltrops: "spikes",
  "Mirror Wall": "reflect",
  "Prism Veil": "lightscreen",
  Barbs: "toxicspikes",
  "Silk Snare": "stickyweb",
  Rampart: "wideguard",
};
/**
 * Showdown's terrains name the moves they modify by ID, like Grassy Terrain's Earthquake, so
 * each sample entry names the Showdown move it stands in for, and must say what Showdown does.
 */
const TERRAIN_MOVES: Record<string, Record<string, { as: string; expect: TerrainMoveModifier }>> = {
  Overgrowth: {
    Tremor: {
      as: "earthquake",
      expect: { move: "Tremor", modifier: [1, 2], grounded: "target" },
    },
  },
};
/** The Showdown ability each sample ability is written to reproduce. */
const ABILITIES: Record<string, string> = {
  "Kindling Heart": "Blaze",
  "Undertow Heart": "Torrent",
  Featherfall: "Levitate",
  Stormcatcher: "Volt Absorb",
  Menace: "Intimidate",
  Cloudburst: "Drizzle",
  "Dust Devil": "Sand Stream",
  "Static Coat": "Static",
  "Barbed Hide": "Rough Skin",
  Purebred: "Adaptability",
  "Hard Shell": "Solid Rock",
  Grit: "Guts",
  Overdrive: "Speed Boost",
  "Rain Runner": "Swift Swim",
  Steadfast: "Sturdy",
  "Loose Limbs": "Limber",
  "Live Wire": "Electric Surge",
  Mischief: "Prankster",
};
/** The Showdown item each sample item is written to reproduce. */
const ITEMS: Record<string, string> = {
  "Moss Pouch": "Leftovers",
  "Glass Charm": "Life Orb",
  "Power Band": "Choice Band",
  "Focus Lens": "Choice Specs",
  "Sprint Shoes": "Choice Scarf",
  "Ember Charm": "Charcoal",
  "Weak Spot Lens": "Expert Belt",
  "Juice Berry": "Sitrus Berry",
  "Remedy Berry": "Lum Berry",
  "Lifeline Ribbon": "Focus Sash",
  "Bastion Vest": "Assault Vest",
  "Spike Guard": "Rocky Helmet",
};

/**
 * Sample moves whose behavior Showdown writes as move callbacks. Each borrows those callbacks
 * from the Showdown move it reproduces, after checking that the sample's data says what the
 * callbacks do. Fields the callbacks already cover are left out of the injected move.
 */
interface Borrowed {
  from: string;
  callbacks: string[];
  expect?: Record<string, unknown>;
  omit?: string[];
}
const BORROWED: Record<string, Borrowed> = {
  "Brace Wall": { from: "protect", callbacks: ["onPrepareHit", "onHit"] },
  "Stand-In": { from: "substitute", callbacks: ["onTryHit", "onHit"] },
  Sunlance: { from: "solarbeam", callbacks: ["onTryMove"], expect: { chargeSkippedIn: ["Sun"] } },
  "Sky Plunge": {
    from: "fly",
    callbacks: ["onTryMove", "condition"],
    expect: { semiInvulnerable: true },
  },
  "Shell Charge": {
    from: "skullbash",
    callbacks: ["onTryMove"],
    expect: { chargeBoosts: { def: 1 } },
  },
  "Spin Clear": {
    from: "rapidspin",
    callbacks: ["onAfterHit", "onAfterSubDamage"],
    expect: {
      clearSideConditions: { user: ["Jagged Stones", "Caltrops", "Barbs", "Silk Snare"] },
      clearUserVolatiles: ["leechseed"],
    },
  },
  "Chime Roulette": { from: "metronome", callbacks: ["onHit"], expect: { calls: "random" } },
  "Dream Chatter": {
    from: "sleeptalk",
    callbacks: ["onTry", "onHit"],
    expect: { calls: "ownMove", sleepUsable: true },
  },
  "Echo Step": { from: "copycat", callbacks: ["onHit"], expect: { calls: "lastMove" } },
  "Seal Move": { from: "disable", callbacks: ["onTryHit"], expect: { volatileStatus: "disable" } },
  "Swipe Away": {
    from: "knockoff",
    callbacks: ["onBasePower", "onAfterHit"],
    expect: { itemEffect: "knockOff" },
  },
  Sleight: { from: "trick", callbacks: ["onTryImmunity", "onHit"], expect: { itemEffect: "swap" } },
  // Baton Pass's `self.onHit` skips the `BeforeSwitchOut` event and its `Update`.
  Relay: {
    from: "batonpass",
    callbacks: ["onHit", "self"],
    expect: { selfSwitch: "copyvolatile" },
  },
  "Drain Seed": {
    from: "leechseed",
    callbacks: ["onTryImmunity"],
    expect: { failsAgainstType: "Grass", volatileStatus: "leechseed" },
  },
  "Ambush Strike": {
    from: "suckerpunch",
    callbacks: ["onTry"],
    expect: { failsUnlessTargetAttacks: true },
  },
  "Lure Call": { from: "followme", callbacks: ["onTry"], expect: { volatileStatus: "followme" } },
  "Cheer On": {
    from: "helpinghand",
    callbacks: ["onTryHit"],
    expect: { volatileStatus: "helpinghand" },
  },
  "Rampart Wall": {
    from: "wideguard",
    callbacks: ["onTry", "onHitSide"],
    expect: { guard: true, sideCondition: "Rampart" },
  },
  "Clear Gust": {
    from: "defog",
    callbacks: ["onHit"],
    expect: {
      boosts: { evasion: -1 },
      clearSideConditions: {
        user: ["Jagged Stones", "Caltrops", "Barbs", "Silk Snare"],
        target: ["Jagged Stones", "Caltrops", "Barbs", "Silk Snare", "Mirror Wall", "Prism Veil"],
      },
      clearTerrain: true,
      substituteBlocksBoosts: true,
    },
    // Defog's callback lowers evasion itself.
    omit: ["boosts"],
  },
};
/** pkmn fields that Showdown expresses in move callbacks instead. */
const PKMN_ONLY_FIELDS = [
  "chargeBoosts",
  "chargeSkippedIn",
  "semiInvulnerable",
  "clearSideConditions",
  "clearTerrain",
  "substituteBlocksBoosts",
  "calls",
  "guard",
  "failsUnlessTargetAttacks",
  "failsAgainstType",
  "clearUserVolatiles",
  "itemEffect",
];
const CHARGING_FIELDS = ["chargeBoosts", "chargeSkippedIn", "semiInvulnerable"];

/**
 * Showdown recognizes a few moves by ID prefix: Solar Beam's (`solarb`) is not charging in sun
 * when Follow Me's redirection is decided. Moves standing in for them keep the prefix.
 */
const ID_PREFIXES: Record<string, string> = { Sunlance: "Solarb " };

/** Sample names can match real Showdown entries, so injected ones carry this suffix. */
function injectedName(name: string): string {
  return `${ID_PREFIXES[name] ?? ""}${name} pkmn`;
}

function lookup(table: Record<string, string>, key: string, kind: string): string {
  const value = table[key];
  if (value === undefined) throw new Error(`No Showdown equivalent for ${kind} ${key}`);
  return value;
}

function reverse(table: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(table).map(([ours, theirs]) => [toID(theirs), ours]));
}

const OUR_WEATHERS = reverse(WEATHERS);
const OUR_TERRAINS = reverse(TERRAINS);
const OUR_PSEUDO_WEATHERS = reverse(PSEUDO_WEATHERS);
const OUR_SIDE_CONDITIONS = reverse(SIDE_CONDITIONS);
const OUR_ITEMS = reverse(ITEMS);

/** A small seeded generator for the harness's own choices, independent of the battle RNG. */
function createRandom(seed: number): (bound: number) => number {
  let state = seed >>> 0;
  return function next(bound: number): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32) * bound);
  };
}

function pick<T>(random: (bound: number) => number, items: readonly T[]): T {
  const item = items[random(items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

/** The injected Showdown move for a sample move. */
function toShowdownMove(move: SampleMove, num: number): Record<string, unknown> {
  const borrowed = BORROWED[move.name];
  const charging = CHARGING_FIELDS.some((field) => move[field] !== undefined);
  const clearing = move.clearSideConditions !== undefined || move.clearTerrain !== undefined;
  const calling = move.calls !== undefined;
  if (
    (charging ||
      clearing ||
      calling ||
      move.stallingMove !== undefined ||
      move.guard !== undefined ||
      move.failsUnlessTargetAttacks !== undefined ||
      move.failsAgainstType !== undefined ||
      move.clearUserVolatiles !== undefined ||
      move.itemEffect !== undefined ||
      move.selfSwitch === "copyvolatile") &&
    borrowed === undefined
  ) {
    throw new Error(`${move.name} needs Showdown callbacks; add it to BORROWED`);
  }
  for (const [field, value] of Object.entries(borrowed?.expect ?? {})) {
    if (!isDeepStrictEqual(move[field], value)) {
      throw new Error(`${move.name}'s ${field} no longer matches ${borrowed?.from}`);
    }
  }
  const omitted = new Set([...PKMN_ONLY_FIELDS, ...(borrowed?.omit ?? [])]);
  const injected: Record<string, unknown> = {
    ...Object.fromEntries(Object.entries(move).filter(([field]) => !omitted.has(field))),
    name: injectedName(move.name),
    num,
    type: move.type ?? "???",
    ...(calling ? { callsMove: true } : {}),
    // pkmn's defaults for fields Showdown requires; a missing `basePower` would be NaN.
    basePower: move.basePower ?? 0,
    target: move.target ?? "normal",
    priority: move.priority ?? 0,
    flags: move.flags ?? {},
  };
  if (move.weather !== undefined) injected["weather"] = lookup(WEATHERS, move.weather, "weather");
  if (move.terrain !== undefined) injected["terrain"] = lookup(TERRAINS, move.terrain, "terrain");
  if (move.pseudoWeather !== undefined) {
    injected["pseudoWeather"] = lookup(PSEUDO_WEATHERS, move.pseudoWeather, "pseudo-weather");
  }
  if (move.sideCondition !== undefined) {
    injected["sideCondition"] = lookup(SIDE_CONDITIONS, move.sideCondition, "side condition");
  }
  if (borrowed !== undefined) {
    const source = Dex.data.Moves[borrowed.from] as Record<string, unknown> | undefined;
    if (source === undefined) throw new Error(`Showdown has no move ${borrowed.from}`);
    for (const callback of borrowed.callbacks) {
      if (source[callback] === undefined) {
        throw new Error(`Showdown's ${borrowed.from} has no ${callback}`);
      }
      injected[callback] = source[callback];
    }
  }
  return injected;
}

/** Adds the sample's species and moves to Showdown's data tables, which load lazily. */
function injectSample(sample: SampleDex): void {
  const pokedex: Record<string, unknown> = {};
  for (const [index, species] of sample.species.entries()) {
    pokedex[toID(injectedName(species.name))] = {
      name: injectedName(species.name),
      types: species.types,
      baseStats: species.baseStats,
      num: 20_000 + index,
      gender: "N",
      abilities: { 0: "No Ability" },
      heightm: 1,
      weightkg: 10,
      eggGroups: ["Undiscovered"],
    };
  }
  const moves: Record<string, unknown> = {};
  for (const [index, move] of sample.moves.entries()) {
    moves[toID(injectedName(move.name))] = toShowdownMove(move, 20_000 + index);
  }
  // Metronome draws from every move with the `metronome` flag, so only the sample's keep it.
  for (const [id, move] of Object.entries(Dex.data.Moves) as [string, { flags?: object }][]) {
    if (move.flags !== undefined && "metronome" in move.flags) {
      const { metronome: _, ...flags } = move.flags as Record<string, number>;
      Dex.data.Moves[id] = { ...move, flags } as unknown as (typeof Dex.data.Moves)[string];
    }
  }
  Object.assign(Dex.data.Pokedex, pokedex);
  Object.assign(Dex.data.Moves, moves);
  for (const terrain of sample.terrains) aliasTerrainMoves(terrain);
  // Showdown lists the semi-invulnerable volatiles by move ID, for effects like Grassy
  // Terrain's healing, so the injected ones join the list.
  const semiInvulnerable = sample.moves
    .filter((move) => move.semiInvulnerable === true)
    .map((move) => toID(injectedName(move.name)));
  const { isSemiInvulnerable } = ShowdownPokemon.prototype as {
    isSemiInvulnerable: (this: Pokemon) => EffectState;
  };
  ShowdownPokemon.prototype.isSemiInvulnerable = function isInjectedSemiInvulnerable(
    this: Pokemon,
  ) {
    const injected = semiInvulnerable.find((id) => id in this.volatiles);
    return (
      (injected === undefined ? undefined : this.volatiles[injected]) ??
      isSemiInvulnerable.call(this)
    );
  };
}

type BasePowerHandler = (
  this: ShowdownBattle,
  basePower: number,
  attacker: Pokemon,
  defender: Pokemon,
  move: { id: string },
) => unknown;

/** Lets a terrain's `onBasePower` see each listed sample move as the move it stands in for. */
function aliasTerrainMoves(terrain: SampleDex["terrains"][number]): void {
  const entries = terrain.moveBasePowerModifiers ?? [];
  if (entries.length === 0) return;
  const aliases = new Map<string, string>();
  for (const entry of entries) {
    const known = TERRAIN_MOVES[terrain.name]?.[entry.move];
    if (known === undefined || !isDeepStrictEqual(entry, known.expect)) {
      throw new Error(`${terrain.name}'s ${entry.move} modifier has no Showdown equivalent`);
    }
    aliases.set(toID(injectedName(entry.move)), known.as);
  }
  const showdownTerrain = Dex.data.Moves[lookup(TERRAINS, terrain.name, "terrain")] as
    | { condition?: { onBasePower?: BasePowerHandler } }
    | undefined;
  const condition = showdownTerrain?.condition;
  const onBasePower = condition?.onBasePower;
  if (condition === undefined || onBasePower === undefined) {
    throw new Error(`Showdown's ${terrain.name} has no onBasePower`);
  }
  condition.onBasePower = function aliasedOnBasePower(basePower, attacker, defender, move) {
    const alias = aliases.get(move.id);
    return onBasePower.call(
      this,
      basePower,
      attacker,
      defender,
      alias === undefined ? move : { ...move, id: alias },
    );
  };
}

function randomSet(random: (bound: number) => number, sample: SampleDex, slot: number): PokemonSet {
  const moves: string[] = [];
  while (moves.length < 4) {
    const name = pick(random, sample.moves).name;
    if (!moves.includes(name)) moves.push(name);
  }
  const evs: StatTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  for (let budget = 127; budget > 0; budget--) {
    const stat = pick(random, STAT_NAMES);
    if (evs[stat] < 252) evs[stat] += 4;
  }
  const ivs = Object.fromEntries(STAT_NAMES.map((stat) => [stat, random(32)])) as StatTable;
  return {
    name: `slot${slot}`,
    species: pick(random, sample.species).name,
    item: random(4) === 0 ? null : pick(random, sample.items).name,
    ability: random(4) === 0 ? null : pick(random, sample.abilities).name,
    moves,
    nature: pick(random, sample.natures).name,
    evs,
    ivs,
    level: 50 + random(51),
    teraType: random(8) === 0 ? "Stellar" : pick(random, sample.types).name,
  };
}

function toShowdownSet(set: PokemonSet): ShowdownSet {
  return {
    ...set,
    species: injectedName(set.species),
    moves: set.moves.map(injectedName),
    gender: "N",
    ability: set.ability === null ? "No Ability" : lookup(ABILITIES, set.ability, "ability"),
    item: set.item === null ? "" : lookup(ITEMS, set.item, "item"),
  };
}

function slotOf(pokemon: Pokemon): number {
  return Number(pokemon.name.slice("slot".length));
}

function bySlot(side: Side): Pokemon[] {
  return side.pokemon.toSorted((left, right) => slotOf(left) - slotOf(right));
}

function sampleName(names: Map<string, string>, id: string): string {
  const name = names.get(id);
  if (name === undefined) throw new Error(`Showdown set up ${id}, which has no sample name`);
  return name;
}

function timed(names: Map<string, string>, id: string, duration: unknown): Timed | null {
  if (id === "") return null;
  return { name: sampleName(names, id), duration: typeof duration === "number" ? duration : null };
}

function snapshotPosition(active: Pokemon): PositionSnapshot {
  const substitute = active.volatiles["substitute"] as { hp: number } | undefined;
  return {
    boosts: BOOST_NAMES.map((name) => active.boosts[name]),
    substitute: substitute?.hp ?? null,
    confused: "confusion" in active.volatiles,
    terastallized: active.terastallized !== undefined,
  };
}

function snapshotSide(side: Side): SideSnapshot {
  const actives = side.active;
  const conditions = Object.entries(side.sideConditions).map(([id, state]) => {
    const effect = state as { duration?: number; layers?: number };
    return {
      name: sampleName(OUR_SIDE_CONDITIONS, id),
      duration: effect.duration ?? null,
      layers: effect.layers ?? 1,
    };
  });
  return {
    active: actives.map(slotOf),
    team: bySlot(side).map((pokemon) => ({
      hp: pokemon.hp,
      // Showdown marks a fainted creature's status `fnt` at its next check; pkmn keeps none.
      status: pokemon.status === "" || pokemon.hp === 0 ? null : pokemon.status,
      item: pokemon.item === "" ? null : (OUR_ITEMS.get(pokemon.item) ?? null),
      pp: pokemon.baseMoveSlots.map((slot) => slot.pp),
    })),
    positions: actives.map(snapshotPosition),
    conditions: conditions.toSorted((left, right) => left.name.localeCompare(right.name)),
  };
}

function snapshot(battle: ShowdownBattle): Snapshot {
  const { field } = battle;
  let winner: Snapshot["winner"] = null;
  const name = battle.winner ?? "";
  if (battle.ended) winner = name === "" ? "tie" : name;
  return {
    turn: battle.turn,
    weather: timed(OUR_WEATHERS, field.weather, field.weatherState.duration),
    terrain: timed(OUR_TERRAINS, field.terrain, field.terrainState.duration),
    pseudoWeathers: Object.entries(field.pseudoWeather)
      .map(([id, state]) => ({
        name: sampleName(OUR_PSEUDO_WEATHERS, id),
        duration: (state as { duration?: number }).duration ?? null,
      }))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
    winner,
    sides: battle.sides.map(snapshotSide),
  };
}

interface SideChoices {
  ours: Choice[];
  theirs: string | null;
}

/**
 * Picks legal choices for each of a side's positions from Showdown's request, in pkmn's team
 * and move slots: at most one Terastallization, no two switches to the same creature, a
 * target location for each aimed move in doubles and triples, and now and then a shift from a
 * triples edge.
 */
function chooseForSide(side: Side, random: (bound: number) => number): SideChoices {
  const request = side.activeRequest;
  const count = side.active.length;
  if (request === null || request.wait === true) {
    return { ours: Array.from({ length: count }, () => "pass"), theirs: null };
  }
  if (request.teamPreview === true) throw new Error("Team preview should be resolved already");
  const taken = new Set<number>();
  const bench = () =>
    side.pokemon
      .map((pokemon, position) => ({ pokemon, position }))
      .filter(
        ({ pokemon, position }) => !pokemon.fainted && !pokemon.isActive && !taken.has(position),
      );
  const ours: Choice[] = [];
  const theirs: string[] = [];
  const pass = () => {
    ours.push("pass");
    theirs.push("pass");
  };
  const switchTo = ({ pokemon, position }: ReturnType<typeof bench>[number]) => {
    taken.add(position);
    ours.push({ switch: slotOf(pokemon) });
    theirs.push(`switch ${position + 1}`);
  };
  let terastallizing = false;
  for (let index = 0; index < count; index++) {
    if (request.forceSwitch !== undefined) {
      const options = bench();
      if (request.forceSwitch[index] === true && options.length > 0)
        switchTo(pick(random, options));
      else pass();
      continue;
    }
    const active = request.active[index];
    const user = side.active[index];
    if (active === undefined || user === undefined || user.fainted) {
      pass();
      continue;
    }
    const switches = active.trapped === true ? [] : bench();
    // Showdown lists only the forced move while a creature is locked in; pkmn names its
    // slot. A move outside the moveset, Struggle or one a calling move locked in, is slot 0.
    const slotOfMove = (id: string) =>
      Math.max(
        0,
        user.baseMoveSlots.findIndex((slot) => slot.id === id),
      );
    const moves = active.moves
      .map((move, moveIndex) => ({ move, moveIndex }))
      .filter(({ move }) => move.disabled !== true && typeof move.disabled !== "string");
    if (switches.length > 0 && (moves.length === 0 || random(10) === 0)) {
      switchTo(pick(random, switches));
      continue;
    }
    if (side.battle.gameType === "triples" && index !== 1 && random(12) === 0) {
      ours.push("shift");
      theirs.push("shift");
      continue;
    }
    const { move, moveIndex } = pick(random, moves);
    const terastallize: boolean =
      !terastallizing && active.canTerastallize !== undefined && random(6) === 0;
    terastallizing ||= terastallize;
    const slot = slotOfMove(move.id);
    // In free-for-all, an aimed move may also leave its target to chance.
    const perHalf = side.battle.activePerHalf;
    const aimed =
      perHalf > 1 && AIMED_TARGETS.has(move.target ?? "") && (count > 1 || random(4) !== 0);
    const tera = terastallize ? " terastallize" : "";
    if (!aimed) {
      ours.push(terastallize ? { terastallize: slot } : { move: slot });
      theirs.push(`move ${moveIndex + 1}${tera}`);
      continue;
    }
    // Any filled location the move can reach: in doubles and free-for-all every other
    // position, in triples the adjacent ones, and only allies for a move at an ally, except
    // in free-for-all.
    const locations = [
      ...Array.from({ length: perHalf }, (_, foe) => foe + 1),
      ...Array.from({ length: perHalf }, (_, ally) => -(ally + 1)),
    ].filter(
      (location) =>
        side.battle.validTargetLoc(location, user, move.target ?? "normal") &&
        (user.getAtLoc(location) as Pokemon | undefined) !== undefined,
    );
    const location = pick(random, locations);
    ours.push(terastallize ? { terastallizeAt: [slot, location] } : { moveAt: [slot, location] });
    theirs.push(`move ${moveIndex + 1} ${location}${tera}`);
  }
  return { ours, theirs: theirs.join(", ") };
}

interface SortedHandler {
  effectHolder?: { fainted?: boolean; sideConditions?: unknown };
}

/**
 * Watches for shuffles pkmn does not reproduce. pkmn sorts residual handlers exactly as
 * Showdown does, draws for the tie among screens in the `ModifyDamage` event, and for the tie
 * among one creature's move-restricting volatiles in `DisableMove`, so those shuffles are
 * expected. Any other shuffle breaks a speed tie, where pkmn draws differently (a
 * documented difference), as does a residual tie that includes a fainted creature's handler.
 */
function watchSpeedTies(battle: ShowdownBattle): () => boolean {
  let seen = false;
  type Sorting = "residual" | "modifyDamage" | "disableMove";
  let next: Sorting | null = null;
  let sorting: Sorting | null = null;
  const fieldEvent = battle.fieldEvent.bind(battle);
  battle.fieldEvent = (eventid, targets) => {
    if (eventid === "Residual") next = "residual";
    fieldEvent(eventid, targets);
  };
  const runEvent = battle.runEvent.bind(battle);
  battle.runEvent = function watchedRunEvent(...args: Parameters<typeof runEvent>): unknown {
    if (args[0] === "ModifyDamage") next = "modifyDamage";
    if (args[0] === "DisableMove") next = "disableMove";
    const result: unknown = runEvent(...args);
    if (next === "modifyDamage" || next === "disableMove") next = null;
    return result;
  };
  const speedSort = battle.speedSort.bind(battle);
  battle.speedSort = (list, comparator) => {
    sorting = next;
    next = null;
    speedSort(list, comparator);
    sorting = null;
  };
  const shuffle = battle.prng.shuffle.bind(battle.prng);
  battle.prng.shuffle = (items, start = 0, end = items.length) => {
    const group = (items as SortedHandler[]).slice(start, end);
    const holders = group.map((handler) => handler.effectHolder);
    const expected =
      (sorting === "residual" &&
        !(holders.some((holder) => holder?.fainted === true) && new Set(holders).size > 1)) ||
      (sorting === "modifyDamage" &&
        holders.every((holder) => holder?.sideConditions !== undefined)) ||
      (sorting === "disableMove" && new Set(holders).size === 1);
    if (!expected) seen = true;
    shuffle(items, start, end);
  };
  return () => seen;
}

function hexSeed(index: number): string {
  const random = createRandom(index * 7919 + 17);
  return Array.from({ length: 4 }, () => random(0x1_0000).toString(16).padStart(4, "0")).join("");
}

/**
 * Whether a rampage was started by a calling move, like Outrage from Metronome. Showdown aims
 * its later turns at the caller's target, the user, so they fail; in the games, and in pkmn,
 * the rampage goes on. A documented difference.
 */
function calledRampage(battle: ShowdownBattle): boolean {
  return battle.sides.some((side) =>
    side.active.some(
      (user) => "lockedmove" in user.volatiles && user.lastMoveTargetLoc === user.getLocOf(user),
    ),
  );
}

/** A copy of a format with another game type and its player count, keeping its rules. */
function withGameType<T extends object>(format: T, gameType: GameType): T {
  return Object.assign(Object.create(Object.getPrototypeOf(format) as object) as T, format, {
    gameType,
    playerCount: gameType === "freeforall" ? 4 : 2,
  });
}

/** Records one battle, or returns `null` if it hits a speed tie before the first choice. */
function recordBattle(index: number, sample: SampleDex, gameType: GameType): RecordedBattle | null {
  const random = createRandom(index);
  const teamSize = TEAM_SIZE[gameType];
  const players = gameType === "freeforall" ? 4 : 2;
  const teams = Array.from({ length: players }, () =>
    Array.from({ length: teamSize }, (_, slot) => randomSet(random, sample, slot)),
  );
  const seed = hexSeed(index);
  const format = Dex.formats.get(FORMATS[gameType], true);
  const battle = new Battle({
    formatid: format.id,
    format:
      gameType === "triples" || gameType === "freeforall" ? withGameType(format, gameType) : format,
    seed: `gen5,${seed}`,
  });
  const speedTieSeen = watchSpeedTies(battle);
  for (const [player, team] of teams.entries()) {
    battle.setPlayer(`p${player + 1}` as "p1", {
      name: `p${player + 1}`,
      team: team.map(toShowdownSet),
    });
  }
  const order = `team ${Array.from({ length: teamSize }, (_, slot) => slot + 1).join("")}`;
  battle.makeChoices(...teams.map(() => order));
  const stats = battle.sides.map((side) =>
    bySlot(side).map(({ storedStats, maxhp }) => ({
      hp: maxhp,
      atk: storedStats.atk,
      def: storedStats.def,
      spa: storedStats.spa,
      spd: storedStats.spd,
      spe: storedStats.spe,
    })),
  );
  const recorded: RecordedBattle = {
    gameType,
    seed,
    teams,
    stats,
    start: snapshot(battle),
    steps: [],
    stopped: "finished",
  };
  if (speedTieSeen()) return null;
  while (!battle.ended) {
    if (recorded.steps.length >= STEP_LIMIT) return { ...recorded, stopped: "step_limit" };
    if (calledRampage(battle)) return { ...recorded, stopped: "called_rampage" };
    const choices = battle.sides.map((side) => chooseForSide(side, random));
    for (const [sideIndex, choice] of choices.entries()) {
      if (choice.theirs !== null) battle.choose(`p${sideIndex + 1}` as "p1", choice.theirs);
    }
    if (speedTieSeen()) return { ...recorded, stopped: "speed_tie" };
    recorded.steps.push({ choices: choices.map(({ ours }) => ours), after: snapshot(battle) });
  }
  return recorded;
}

function main(): void {
  const options = process.argv.slice(2);
  const gameType: GameType = options.includes("--free-for-all")
    ? "freeforall"
    : options.includes("--triples")
      ? "triples"
      : options.includes("--doubles")
        ? "doubles"
        : "singles";
  const battles = Number(options.find((option) => !option.startsWith("--")) ?? 2000);
  const sample = JSON.parse(readFileSync(SAMPLE, "utf8")) as SampleDex;
  injectSample(sample);
  const recorded = Array.from({ length: battles }, (_, index) =>
    recordBattle(index, sample, gameType),
  ).filter((battle) => battle !== null);
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(
    new URL(
      gameType === "singles"
        ? "showdown.json"
        : `showdown-${gameType === "freeforall" ? "free-for-all" : gameType}.json`,
      FIXTURES,
    ),
    `${JSON.stringify({ generator: "pokemon-showdown@0.11.11", battles: recorded })}\n`,
  );
  const steps = recorded.reduce((total, battle) => total + battle.steps.length, 0);
  const tied = recorded.filter((battle) => battle.stopped === "speed_tie").length;
  process.stdout.write(
    `Recorded ${recorded.length} of ${battles} battles, ${steps} steps (${tied} stopped at a speed tie).\n`,
  );
}

main();
