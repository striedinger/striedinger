/**
 * Records reference battles from Pokémon Showdown for pkmn's differential test.
 *
 * pkmn's content format follows Showdown's data files, so the sample pack's species and moves
 * are injected into Showdown's data tables almost unchanged. The sample's original abilities
 * and items are mapped to the Showdown ones they are written to reproduce, and its weather
 * names to Showdown's weather IDs. Random battles then run from `gen5` seeds, which use the
 * same 64-bit LCG as pkmn's PRNG. Every step's choices and resulting state are written to
 * `tests/fixtures/showdown.json`; `tests/showdown.rs` replays them through pkmn and compares.
 *
 * Showdown draws extra random numbers whenever the two active creatures are speed-tied, so a
 * battle's recording stops at its first speed tie.
 *
 * Usage: pnpm --filter @workspace/pkmn-oracle generate [battles]
 */

import type { Battle as ShowdownBattle, Pokemon, Side } from "pokemon-showdown";
import type { PokemonSet as ShowdownSet } from "pokemon-showdown/dist/sim/teams.js";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import showdown from "pokemon-showdown";

const { Battle, Dex, toID } = showdown;

type StatName = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
type StatTable = Record<StatName, number>;
type Choice = { move: number } | { switch: number } | "pass";

interface SampleMove {
  name: string;
  type: string | null;
  weather?: string;
  flags?: Record<string, number | boolean>;
  [field: string]: unknown;
}

interface SampleDex {
  weathers: { name: string }[];
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
}

interface SideSnapshot {
  active: number;
  team: { hp: number; status: string | null; item: string | null }[];
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
const STAT_NAMES: readonly StatName[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const BOOST_NAMES = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"] as const;

/** Showdown's weather condition for each sample weather. */
const WEATHERS: Record<string, string> = {
  Rain: "RainDance",
  Sun: "SunnyDay",
  Sandstorm: "Sandstorm",
  Snow: "Snowscape",
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

function lookup(table: Record<string, string>, key: string, kind: string): string {
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

/** Adds the sample's species and moves to Showdown's data tables, which load lazily. */
function injectSample(sample: SampleDex): void {
  const pokedex: Record<string, unknown> = {};
  for (const [index, species] of sample.species.entries()) {
    pokedex[toID(species.name)] = {
      ...species,
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
    moves[toID(move.name)] = {
      ...move,
      num: 20_000 + index,
      type: move.type ?? "???",
      flags: { protect: 1, ...move.flags },
      ...(move.weather === undefined ? {} : { weather: lookup(WEATHERS, move.weather, "weather") }),
    };
  }
  Object.assign(Dex.data.Pokedex, pokedex);
  Object.assign(Dex.data.Moves, moves);
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
  };
}

function toShowdownSet(set: PokemonSet): ShowdownSet {
  return {
    ...set,
    gender: "N",
    ability: set.ability === null ? "No Ability" : lookup(ABILITIES, set.ability, "ability"),
    item: set.item === null ? "" : lookup(ITEMS, set.item, "item"),
  };
}

function slotOf(pokemon: Pokemon): number {
  return Number(pokemon.name.slice("slot".length));
}

function snapshot(battle: ShowdownBattle): Snapshot {
  const ourItems = new Map(Object.entries(ITEMS).map(([ours, theirs]) => [toID(theirs), ours]));
  const ourWeathers = new Map(
    Object.entries(WEATHERS).map(([ours, theirs]) => [toID(theirs), ours]),
  );
  const sides = battle.sides.map((side) => {
    const active = side.active[0];
    if (active === undefined) throw new Error("A side has no active creature");
    return {
      active: slotOf(active),
      team: side.pokemon
        .toSorted((left, right) => slotOf(left) - slotOf(right))
        .map((pokemon) => ({
          hp: pokemon.hp,
          status: pokemon.status === "" ? null : pokemon.status,
          item: pokemon.item === "" ? null : (ourItems.get(pokemon.item) ?? null),
        })),
      boosts: BOOST_NAMES.map((name) => active.boosts[name]),
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
  const options = (request.active[0]?.moves ?? [])
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
    Array.from({ length: TEAM_SIZE }, (_, slot) => randomSet(random, sample, slot)),
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
      .map(({ storedStats, maxhp }) => ({
        hp: maxhp,
        atk: storedStats.atk,
        def: storedStats.def,
        spa: storedStats.spa,
        spd: storedStats.spd,
        spe: storedStats.spe,
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
  writeFileSync(
    new URL("showdown.json", fixtures),
    `${JSON.stringify({ generator: "pokemon-showdown@0.11.11", battles: recorded })}\n`,
  );
  const steps = recorded.reduce((total, battle) => total + battle.steps.length, 0);
  const tied = recorded.filter((battle) => battle.stopped === "speed_tie").length;
  process.stdout.write(
    `Recorded ${battles} battles, ${steps} steps (${tied} stopped at a speed tie).\n`,
  );
}

main();
