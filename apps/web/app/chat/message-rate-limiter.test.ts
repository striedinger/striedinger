import { describe, expect, it } from "vitest";

import { MessageRateLimiter } from "./message-rate-limiter";

describe("message rate limiter", function () {
  it("rejects traffic beyond the per-window limit", function () {
    const limiter = new MessageRateLimiter(2, 1_000);

    expect(limiter.allows(100)).toBe(true);
    expect(limiter.allows(200)).toBe(true);
    expect(limiter.allows(300)).toBe(false);
  });

  it("allows messages again when the window expires", function () {
    const limiter = new MessageRateLimiter(1, 1_000);

    expect(limiter.allows(100)).toBe(true);
    expect(limiter.allows(999)).toBe(false);
    expect(limiter.allows(1_100)).toBe(true);
  });
});
