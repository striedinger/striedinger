export class MessageRateLimiter {
  #acceptedInWindow = 0;
  #windowStartedAt = 0;

  constructor(
    readonly maximumMessages: number,
    readonly windowDuration: number,
  ) {
    if (!Number.isSafeInteger(maximumMessages) || maximumMessages < 1) {
      throw new Error("Maximum messages must be a positive integer");
    }
    if (!Number.isFinite(windowDuration) || windowDuration <= 0) {
      throw new Error("Window duration must be positive");
    }
  }

  allows(now: number) {
    if (now - this.#windowStartedAt >= this.windowDuration) {
      this.#windowStartedAt = now;
      this.#acceptedInWindow = 0;
    }
    if (this.#acceptedInWindow >= this.maximumMessages) return false;
    this.#acceptedInWindow += 1;
    return true;
  }
}
