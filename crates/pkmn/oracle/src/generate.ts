/**
 * Records reference battles from Pokémon Showdown for pkmn's differential test.
 *
 * pkmn's sample content pack is injected into Showdown's data tables. Its original abilities
 * and items are mapped to the Showdown traits they are written to reproduce. Random battles
 * then run from `gen5` seeds, which use the same 64-bit LCG as pkmn's PRNG. Every step's
 * choices and resulting state are written to `tests/fixtures/showdown.json`, and
 * `tests/showdown.rs` replays them through pkmn and compares the states.
 *
 * Showdown makes extra RNG calls whenever the two active creatures are speed-tied, so a
 * battle's recording stops at its first speed tie.
 *
 * Usage: pnpm --filter @workspace/pkmn-oracle generate [battles]
 */

import type { Battle as ShowdownBattle, Pokemon, Side } from "pokemon-showdown";
import type { PokemonSet as ShowdownSet } from "pokemon-showdown/dist/sim/teams.js";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import showdown from "pokemon-showdown";

const { Battle, Dex, toID } = showdown;

interface StatTable {
  hp: number;
  attack: number;
  defense: number;
  special_attack: number;
  special_defense: number;
  speed: number;
}

interface SampleMove {
  name: string;
  type: string | null;
  category: "physical" | "special" | "status";
  power?: number;
  accuracy?: number;
  pp: number;
  priority?: number;
  target?: "opponent" | "user";
  crit_stage?: number;
  hits?: [number, number];
  drain?: [number, number];
  recoil?: { damage_dealt: [number, number] } | { max_hp: [number, number] };
  respects_type_immunity?: boolean;
  contact?: boolean;
  effects?: SampleEffect[];
}

interface SampleEffect {
  chance?: number;
  target?: "target" | "user";
  effect:
    | { boost: { stat: BoostName; stages: number } }
    | { status: StatusName }
    | { weather: string }
    | { heal: [number, number] }
    | "confuse"
    | "flinch";
}

interface SampleDex {
  species: { name: string; types: string[]; base_stats: StatTable }[];
  moves: SampleMove[];
  abilities: { name: string }[];
  items: { name: string }[];
}

type BoostName =
  | "attack"
  | "defense"
  | "special_attack"
  | "special_defense"
  | "speed"
  | "accuracy"
  | "evasion";
type StatusName = "burn" | "paralysis" | "poison" | "toxic" | "sleep" | "freeze";
type Choice = { move: number } | { switch: number } | "struggle" | "pass";

interface PokemonSet {
  species: string;
  level: number;
  moves: string[];
  evs: StatTable;
  ivs: StatTable;
  nature: { increased: keyof StatTable; decreased: keyof StatTable } | null;
  ability: string | null;
  item: string | null;
}

interface PokemonSnapshot {
  hp: number;
  status: StatusName | null;
  item: string | null;
}

interface SideSnapshot {
  active: number;
  team: PokemonSnapshot[];
  boosts: number[];
}

interface Snapshot {
  turn: number;
  weather: string | null;
  winner: "p1" | "p2" | "tie" | null;
  sides: SideSnapshot[];
}

interface RecordedBattle {
  seed: string;
  teams: PokemonSet[][];
  stats: StatTable[][];
  start: Snapshot;
  steps: { choices: Choice[]; after: Snapshot }[];
  stopped: "finished" | "speed_tie" | "step_limit";
}

const TEAM_SIZE = 3;
const STEP_LIMIT = 300;

const STAT_KEYS = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  special_attack: "spa",
  special_defense: "spd",
  speed: "spe",
} as const;
const BOOST_KEYS = {
  attack: "atk",
  defense: "def",
  special_attack: "spa",
  special_defense: "spd",
  speed: "spe",
  accuracy: "accuracy",
  evasion: "evasion",
} as const;
const STATUS_IDS = {
  burn: "brn",
  paralysis: "par",
  poison: "psn",
  toxic: "tox",
  sleep: "slp",
  freeze: "frz",
} as const;
const WEATHER_IDS: Record<string, string> = {
  Rain: "RainDance",
  Sun: "SunnyDay",
  Sandstorm: "Sandstorm",
  Snow: "Snowscape",
};
/** The Showdown trait each sample trait is written to reproduce. */
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
};
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
const NATURES: Record<string, string> = {
  "attack/defense": "Lonely",
  "attack/special_attack": "Adamant",
  "attack/special_defense": "Naughty",
  "attack/speed": "Brave",
  "defense/attack": "Bold",
  "defense/special_attack": "Impish",
  "defense/special_defense": "Lax",
  "defense/speed": "Relaxed",
  "special_attack/attack": "Modest",
  "special_attack/defense": "Mild",
  "special_attack/special_defense": "Rash",
  "special_attack/speed": "Quiet",
  "special_defense/attack": "Calm",
  "special_defense/defense": "Gentle",
  "special_defense/special_attack": "Careful",
  "special_defense/speed": "Sassy",
  "speed/attack": "Timid",
  "speed/defense": "Hasty",
  "speed/special_attack": "Jolly",
  "speed/special_defense": "Naive",
};

function toId(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function lookup<T>(table: Record<string, T>, key: string, kind: string): T {
  const value = table[key];
  if (value === undefined) throw new Error(`No Showdown equivalent for ${kind} ${key}`);
  return value;
}

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

function toShowdownBoosts(stat: BoostName, stages: number): Record<string, number> {
  return { [BOOST_KEYS[stat]]: stages };
}

/** Translates pkmn's effect list into Showdown's move fields, following the engine's rules. */
function toShowdownEffects(move: SampleMove): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const effects = move.effects ?? [];
  const damaging = move.category !== "status";
  const recipientIsUser = (effect: SampleEffect) =>
    effect.target === "user" || move.target === "user";
  if (!damaging) {
    for (const effect of effects) {
      if (effect.chance !== undefined) {
        throw new Error(`${move.name}: chance effects on status moves are not mapped`);
      }
      if (recipientIsUser(effect) !== (move.target === "user")) {
        throw new Error(`${move.name}: status moves must affect their own target`);
      }
      const kind = effect.effect;
      if (kind === "confuse") fields["volatileStatus"] = "confusion";
      else if (kind === "flinch") throw new Error(`${move.name}: flinching status moves`);
      else if ("boost" in kind)
        fields["boosts"] = {
          ...(fields["boosts"] as object | undefined),
          ...toShowdownBoosts(kind.boost.stat, kind.boost.stages),
        };
      else if ("status" in kind) fields["status"] = STATUS_IDS[kind.status];
      else if ("weather" in kind) fields["weather"] = lookup(WEATHER_IDS, kind.weather, "weather");
      else fields["heal"] = kind.heal;
    }
    return fields;
  }
  const selfBoosts: Record<string, number> = {};
  const secondaries: Record<string, unknown>[] = [];
  for (const effect of effects) {
    const kind = effect.effect;
    if (effect.target === "user" && effect.chance === undefined) {
      if (typeof kind === "string" || !("boost" in kind)) {
        throw new Error(`${move.name}: only boosts are mapped as unconditional self effects`);
      }
      Object.assign(selfBoosts, toShowdownBoosts(kind.boost.stat, kind.boost.stages));
      continue;
    }
    let secondary: Record<string, unknown>;
    if (kind === "confuse") secondary = { volatileStatus: "confusion" };
    else if (kind === "flinch") secondary = { volatileStatus: "flinch" };
    else if ("boost" in kind)
      secondary = { boosts: toShowdownBoosts(kind.boost.stat, kind.boost.stages) };
    else if ("status" in kind) secondary = { status: STATUS_IDS[kind.status] };
    else throw new Error(`${move.name}: weather and heal secondaries are not mapped`);
    if (effect.target === "user") secondary = { self: secondary };
    if (effect.chance !== undefined) secondary["chance"] = effect.chance;
    secondaries.push(secondary);
  }
  if (Object.keys(selfBoosts).length > 0) fields["self"] = { boosts: selfBoosts };
  if (secondaries.length > 0) fields["secondaries"] = secondaries;
  return fields;
}

function injectSample(sample: SampleDex): void {
  const pokedex: Record<string, unknown> = {};
  for (const [index, species] of sample.species.entries()) {
    const stats = species.base_stats;
    pokedex[toId(species.name)] = {
      num: 20_000 + index,
      name: species.name,
      types: species.types,
      gender: "N",
      baseStats: {
        hp: stats.hp,
        atk: stats.attack,
        def: stats.defense,
        spa: stats.special_attack,
        spd: stats.special_defense,
        spe: stats.speed,
      },
      abilities: { 0: "No Ability" },
      heightm: 1,
      weightkg: 10,
      eggGroups: ["Undiscovered"],
    };
  }
  const moves: Record<string, unknown> = {};
  for (const [index, move] of sample.moves.entries()) {
    const recoil = move.recoil;
    if (recoil !== undefined && "max_hp" in recoil) {
      throw new Error(`${move.name}: max-HP recoil is only supported for Struggle`);
    }
    const hits = move.hits;
    moves[toId(move.name)] = {
      num: 20_000 + index,
      name: move.name,
      type: move.type ?? "???",
      category: move.category[0]?.toUpperCase() + move.category.slice(1),
      basePower: move.power ?? 0,
      accuracy: move.accuracy ?? true,
      pp: move.pp,
      priority: move.priority ?? 0,
      target: move.target === "user" ? "self" : "normal",
      critRatio: 1 + (move.crit_stage ?? 0),
      flags: move.contact === true ? { contact: 1, protect: 1 } : { protect: 1 },
      ...(hits === undefined ? {} : { multihit: hits[0] === hits[1] ? hits[0] : hits }),
      ...(move.drain === undefined ? {} : { drain: move.drain }),
      ...(recoil === undefined ? {} : { recoil: recoil.damage_dealt }),
      ...(move.respects_type_immunity === true ? { ignoreImmunity: false } : {}),
      ...toShowdownEffects(move),
    };
  }
  Object.assign(Dex.data.Pokedex, pokedex);
  Object.assign(Dex.data.Moves, moves);
}

function randomSet(random: (bound: number) => number, sample: SampleDex): PokemonSet {
  const moves: string[] = [];
  while (moves.length < 4) {
    const name = pick(random, sample.moves).name;
    if (!moves.includes(name)) moves.push(name);
  }
  const statNames = Object.keys(STAT_KEYS) as (keyof StatTable)[];
  const evs: StatTable = {
    hp: 0,
    attack: 0,
    defense: 0,
    special_attack: 0,
    special_defense: 0,
    speed: 0,
  };
  for (let budget = 127; budget > 0; budget--) {
    const stat = pick(random, statNames);
    if (evs[stat] < 252) evs[stat] += 4;
  }
  const ivs: StatTable = {
    hp: random(32),
    attack: random(32),
    defense: random(32),
    special_attack: random(32),
    special_defense: random(32),
    speed: random(32),
  };
  const nonHp = statNames.filter((stat) => stat !== "hp");
  const increased = pick(random, nonHp);
  const decreased = pick(random, nonHp);
  const ability = random(4) === 0 ? null : pick(random, sample.abilities).name;
  const item = random(4) === 0 ? null : pick(random, sample.items).name;
  return {
    species: pick(random, sample.species).name,
    level: 50 + random(51),
    moves,
    evs,
    ivs,
    nature: increased === decreased ? null : { increased, decreased },
    ability,
    item,
  };
}

function toShowdownStats(table: StatTable): ShowdownSet["evs"] {
  return {
    hp: table.hp,
    atk: table.attack,
    def: table.defense,
    spa: table.special_attack,
    spd: table.special_defense,
    spe: table.speed,
  };
}

function toShowdownSet(set: PokemonSet, slot: number): ShowdownSet {
  return {
    name: `slot${slot}`,
    species: set.species,
    level: set.level,
    gender: "N",
    moves: set.moves,
    evs: toShowdownStats(set.evs),
    ivs: toShowdownStats(set.ivs),
    nature:
      set.nature === null
        ? "Hardy"
        : lookup(NATURES, `${set.nature.increased}/${set.nature.decreased}`, "nature"),
    ability: set.ability === null ? "No Ability" : lookup(ABILITIES, set.ability, "ability"),
    item: set.item === null ? "" : lookup(ITEMS, set.item, "item"),
  };
}

function slotOf(pokemon: Pokemon): number {
  return Number(pokemon.name.slice("slot".length));
}

function snapshot(battle: ShowdownBattle): Snapshot {
  const ourItems = new Map(Object.entries(ITEMS).map(([ours, theirs]) => [toId(theirs), ours]));
  const ourWeathers = new Map(
    Object.entries(WEATHER_IDS).map(([ours, theirs]) => [toId(theirs), ours]),
  );
  const ourStatuses = new Map(
    Object.entries(STATUS_IDS).map(([ours, theirs]) => [theirs as string, ours as StatusName]),
  );
  const sides = battle.sides.map((side) => {
    const bySlot = side.pokemon.toSorted((left, right) => slotOf(left) - slotOf(right));
    const active = side.active[0];
    if (active === undefined) throw new Error("A side has no active creature");
    return {
      active: slotOf(active),
      team: bySlot.map((pokemon) => ({
        hp: pokemon.hp,
        status: ourStatuses.get(pokemon.status) ?? null,
        item: pokemon.item === "" ? null : (ourItems.get(pokemon.item) ?? null),
      })),
      boosts: Object.values(BOOST_KEYS).map((key) => active.boosts[key]),
    };
  });
  let winner: Snapshot["winner"] = null;
  if (battle.ended) winner = battle.winner === "p1" ? "p1" : battle.winner === "p2" ? "p2" : "tie";
  return {
    turn: battle.turn,
    weather: ourWeathers.get(battle.field.weather) ?? null,
    winner,
    sides,
  };
}

/** Picks a legal choice from Showdown's request, expressed in pkmn's team slots. */
function chooseFor(
  side: Side,
  random: (bound: number) => number,
): { ours: Choice; theirs: string | null } {
  const request = side.activeRequest;
  if (request === null || request.wait === true) return { ours: "pass", theirs: null };
  const switches = side.pokemon
    .map((pokemon, position) => ({ pokemon, position }))
    .filter(({ pokemon }) => !pokemon.fainted && !pokemon.isActive);
  const toSwitch = ({ pokemon, position }: (typeof switches)[number]) => ({
    ours: { switch: slotOf(pokemon) },
    theirs: `switch ${position + 1}`,
  });
  if (request.forceSwitch !== undefined) return toSwitch(pick(random, switches));
  if (request.teamPreview === true) throw new Error("Team preview should be resolved already");
  const moves = request.active[0]?.moves ?? [];
  if (moves.length === 1 && moves[0]?.id === "struggle") {
    return { ours: "struggle", theirs: "move 1" };
  }
  const options = moves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => move.disabled !== true && typeof move.disabled !== "string")
    .map(({ index }) => ({
      ours: { move: index } as Choice,
      theirs: `move ${index + 1}` as string | null,
    }));
  if (switches.length > 0 && (options.length === 0 || random(10) === 0)) {
    return toSwitch(pick(random, switches));
  }
  return pick(random, options);
}

/** Showdown only shuffles to break speed ties, so any shuffle means pkmn's RNG would diverge. */
function watchSpeedTies(battle: ShowdownBattle): () => boolean {
  let seen = false;
  const shuffle = battle.prng.shuffle.bind(battle.prng);
  battle.prng.shuffle = (items, start, end) => {
    seen = true;
    shuffle(items, start, end);
  };
  return () => seen;
}

function hexSeed(index: number): string {
  const random = createRandom(index * 7919 + 17);
  return Array.from({ length: 4 }, () => random(0x1_0000).toString(16).padStart(4, "0")).join("");
}

function recordBattle(index: number, sample: SampleDex): RecordedBattle {
  const random = createRandom(index);
  const teams = [0, 1].map(() =>
    Array.from({ length: TEAM_SIZE }, () => randomSet(random, sample)),
  );
  const seed = hexSeed(index);
  const battle = new Battle({ formatid: toID("gen9customgame"), seed: `gen5,${seed}` });
  const speedTieSeen = watchSpeedTies(battle);
  battle.setPlayer("p1", { name: "p1", team: (teams[0] ?? []).map(toShowdownSet) });
  battle.setPlayer("p2", { name: "p2", team: (teams[1] ?? []).map(toShowdownSet) });
  battle.makeChoices("team 123", "team 123");
  const stats = battle.sides.map((side) =>
    side.pokemon
      .toSorted((left, right) => slotOf(left) - slotOf(right))
      .map((pokemon) => ({
        hp: pokemon.maxhp,
        attack: pokemon.storedStats.atk,
        defense: pokemon.storedStats.def,
        special_attack: pokemon.storedStats.spa,
        special_defense: pokemon.storedStats.spd,
        speed: pokemon.storedStats.spe,
      })),
  );
  const recorded: RecordedBattle = {
    seed,
    teams,
    stats,
    start: snapshot(battle),
    steps: [],
    stopped: "finished",
  };
  if (speedTieSeen()) return { ...recorded, stopped: "speed_tie" };
  while (!battle.ended) {
    if (recorded.steps.length >= STEP_LIMIT) return { ...recorded, stopped: "step_limit" };
    const choices = battle.sides.map((side) => chooseFor(side, random));
    for (const [sideIndex, choice] of choices.entries()) {
      if (choice.theirs !== null) battle.choose(sideIndex === 0 ? "p1" : "p2", choice.theirs);
    }
    if (speedTieSeen()) return { ...recorded, stopped: "speed_tie" };
    recorded.steps.push({ choices: choices.map(({ ours }) => ours), after: snapshot(battle) });
  }
  return recorded;
}

function main(): void {
  const battles = Number(process.argv[2] ?? 200);
  const sample = JSON.parse(
    readFileSync(new URL("../../data/sample.json", import.meta.url), "utf8"),
  ) as SampleDex;
  injectSample(sample);
  const recorded = Array.from({ length: battles }, (_, index) => recordBattle(index, sample));
  const fixtures = new URL("../../tests/fixtures/", import.meta.url);
  mkdirSync(fixtures, { recursive: true });
  const output = new URL("showdown.json", fixtures);
  writeFileSync(
    output,
    `${JSON.stringify({ generator: "pokemon-showdown@0.11.11", battles: recorded })}\n`,
  );
  const steps = recorded.reduce((total, battle) => total + battle.steps.length, 0);
  const tied = recorded.filter((battle) => battle.stopped === "speed_tie").length;
  process.stdout.write(
    `Recorded ${battles} battles, ${steps} steps (${tied} stopped at a speed tie).\n`,
  );
}

main();
