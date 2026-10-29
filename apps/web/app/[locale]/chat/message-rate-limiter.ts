export class MessageRateLimiter {
  #acceptedInWindow = 0;
  #windowStartedAt = 0;
  readonly maximumMessages: number;
  readonly windowDuration: number;

  constructor(maximumMessages: number, windowDuration: number) {
    if (!Number.isSafeInteger(maximumMessages) || maximumMessages < 1) {
      throw new Error("Maximum messages must be a positive integer");
    }
    if (!Number.isFinite(windowDuration) || windowDuration <= 0) {
      throw new Error("Window duration must be positive");
    }
    this.maximumMessages = maximumMessages;
    this.windowDuration = windowDuration;
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
