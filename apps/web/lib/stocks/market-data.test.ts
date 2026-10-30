import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStockSeries, searchStockSymbols } from "./market-data";

vi.mock("next/cache", function mockCache() {
  return { cacheLife: vi.fn<() => void>(), cacheTag: vi.fn<() => void>() };
});

const apiKey = "test-twelve-data-key";
const fetchMock = vi.fn<typeof fetch>();

beforeEach(function stubUpstream() {
  vi.stubEnv("TWELVE_DATA_API_KEY", apiKey);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(function restoreUpstream() {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** The single upstream request, as the URL it named and the authorization it carried. */
function readUpstreamRequest() {
  expect(fetchMock).toHaveBeenCalledOnce();
  const [input, init] = fetchMock.mock.calls[0] ?? [];
  const url = new URL(input instanceof Request ? input.url : (input ?? ""));
  return { authorization: new Headers(init?.headers).get("Authorization"), url };
}

describe("Twelve Data requests", function () {
  it("sends the API key in a header rather than the search URL", async function () {
    fetchMock.mockResolvedValue(Response.json({ data: [], status: "ok" }));
    await searchStockSymbols("ZZZZ");
    const { authorization, url } = readUpstreamRequest();
    expect(authorization).toBe(`apikey ${apiKey}`);
    expect(url.href).not.toContain(apiKey);
  });

  it("sends the API key in a header rather than the series URL", async function () {
    fetchMock.mockResolvedValue(
      Response.json({
        values: [
          { close: "2", datetime: "2026-10-29", high: "3", low: "1", open: "1.5", volume: "10" },
        ],
      }),
    );
    await getStockSeries({ currency: "", exchange: "", name: "ZZZZ", symbol: "ZZZZ" }, "1Y");
    const { authorization, url } = readUpstreamRequest();
    expect(authorization).toBe(`apikey ${apiKey}`);
    expect(url.href).not.toContain(apiKey);
  });
});
