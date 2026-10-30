const aliasAdjectives = ["Amber", "Blue", "Bright", "Calm", "Copper", "Quiet", "Silver", "Swift"];
const aliasAnimals = ["Badger", "Finch", "Fox", "Heron", "Moth", "Otter", "Owl", "Wren"];
const aliasNumberPattern = /^[1-9]\d{0,2}$/u;

export function createAnonymousAlias(): string {
  const [adjectiveValue = 0, animalValue = 0] = crypto.getRandomValues(new Uint16Array(2));
  return `${aliasAdjectives[adjectiveValue % aliasAdjectives.length]} ${aliasAnimals[animalValue % aliasAnimals.length]}`;
}

/**
 * Accepts only names this app generates, optionally numbered to tell two apart. Names come
 * from remote devices, so free text could otherwise mimic labels such as "Name via Name".
 */
export function normalizePeerAlias(alias: string | undefined, fallbackAlias: string): string {
  if (alias === undefined) return fallbackAlias;
  const [adjective = "", animal = "", aliasNumber, ...extraWords] = alias.split(" ");
  const isGenerated =
    aliasAdjectives.includes(adjective) &&
    aliasAnimals.includes(animal) &&
    (aliasNumber === undefined || aliasNumberPattern.test(aliasNumber)) &&
    extraWords.length === 0;
  return isGenerated ? alias : fallbackAlias;
}

/**
 * Picks the name a newly opened connection is shown under. One matching this device or
 * another connection gets a number, so every connection reads as a distinct sender.
 */
export function choosePeerAlias(
  requestedAlias: string | undefined,
  takenAliases: Iterable<string>,
  fallbackAlias: string,
): string {
  const baseAlias = normalizePeerAlias(requestedAlias, fallbackAlias);
  const taken = new Set(takenAliases);
  if (!taken.has(baseAlias)) return baseAlias;

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${baseAlias} ${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
