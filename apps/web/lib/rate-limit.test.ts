import { afterEach, describe, expect, it, vi } from "vitest";

import { isRateLimited } from "./rate-limit";

function createOptions(scope = "preview") {
  return {
    identifier: `test-${crypto.randomUUID()}`,
    maximumRequests: 2,
    scope,
    windowMilliseconds: 60_000,
  };
}

function stubFailingStore() {
  vi.stubEnv("KV_REST_API_URL", "https://store.example");
  vi.stubEnv("KV_REST_API_TOKEN", "token");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
}

afterEach(function () {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("isRateLimited", function () {
  it("limits repeated work without mixing independent action scopes", async function () {
    const options = createOptions();

    await expect(isRateLimited(options)).resolves.toBe(false);
    await expect(isRateLimited(options)).resolves.toBe(false);
    await expect(isRateLimited(options)).resolves.toBe(true);
    await expect(isRateLimited({ ...options, scope: "arrivals" })).resolves.toBe(false);
  });

  describe("when the shared store fails", function () {
    it("treats fail-closed scopes as limited", async function () {
      stubFailingStore();

      await expect(isRateLimited({ ...createOptions(), failClosed: true })).resolves.toBe(true);
    });

    it("falls back to the per-instance limit for other scopes", async function () {
      stubFailingStore();
      const options = createOptions();

      await expect(isRateLimited(options)).resolves.toBe(false);
      await expect(isRateLimited(options)).resolves.toBe(false);
      await expect(isRateLimited(options)).resolves.toBe(true);
    });
  });

  it("uses the per-instance limit for fail-closed scopes when no store is configured", async function () {
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");

    await expect(isRateLimited({ ...createOptions(), failClosed: true })).resolves.toBe(false);
  });
});
