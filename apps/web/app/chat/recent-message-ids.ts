export class RecentMessageIds {
  readonly #ids = new Set<string>();

  constructor(readonly maximumSize: number) {
    if (!Number.isSafeInteger(maximumSize) || maximumSize < 1) {
      throw new Error("Maximum size must be a positive integer");
    }
  }

  add(id: string) {
    if (this.#ids.has(id)) return;
    this.#ids.add(id);

    const oldestId = this.#ids.values().next().value;
    if (this.#ids.size > this.maximumSize && oldestId !== undefined) this.#ids.delete(oldestId);
  }

  has(id: string) {
    return this.#ids.has(id);
  }
}
