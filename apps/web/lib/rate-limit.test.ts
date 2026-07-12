import { describe, expect, it } from "vitest";

import { isRateLimited } from "./rate-limit";

describe("isRateLimited", function () {
  it("limits repeated work without mixing independent action scopes", async function () {
    const identifier = `test-${crypto.randomUUID()}`;
    const options = {
      identifier,
      maximumRequests: 2,
      scope: "preview",
      windowMilliseconds: 60_000,
    };

    await expect(isRateLimited(options)).resolves.toBe(false);
    await expect(isRateLimited(options)).resolves.toBe(false);
    await expect(isRateLimited(options)).resolves.toBe(true);
    await expect(isRateLimited({ ...options, scope: "arrivals" })).resolves.toBe(false);
  });
});
