import type { ComponentProps } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StockIdentity, StockSeries, StocksLabels } from "./types";

import { StockDashboard } from "./stock-dashboard";
import { StockDashboardLoader } from "./stock-dashboard-loader";

const data = vi.hoisted(function createDataMocks() {
  return {
    searchStockSymbols: vi.fn<(query: string) => Promise<StockIdentity[]>>(),
    getStockSeries: vi.fn<(stock: StockIdentity) => Promise<StockSeries>>(),
  };
});
const request = vi.hoisted(function createRequestMocks() {
  return {
    headers: new Headers(),
    limitedScopes: new Set<string>(),
    isRateLimited: vi.fn<(options: { scope: string }) => Promise<boolean>>(),
  };
});
vi.mock("../../../lib/stocks/market-data", function mockData() {
  return data;
});
vi.mock("next/headers", function mockHeaders() {
  return {
    headers() {
      return Promise.resolve(request.headers);
    },
  };
});
vi.mock("../../../lib/client-identifier", function mockClientIdentifier() {
  return {
    getClientIdentifier() {
      return Promise.resolve("203.0.113.7");
    },
  };
});
vi.mock("../../../lib/rate-limit", function mockRateLimit() {
  return { isRateLimited: request.isRateLimited };
});

beforeEach(function resetRequest() {
  vi.clearAllMocks();
  request.headers = new Headers();
  request.limitedScopes.clear();
  request.isRateLimited.mockImplementation(function checkScope({ scope }) {
    return Promise.resolve(request.limitedScopes.has(scope));
  });
  data.searchStockSymbols.mockResolvedValue([]);
  data.getStockSeries.mockRejectedValue(new Error("Market data unavailable"));
});

function loadDashboard(searchParams: Record<string, string>) {
  return StockDashboardLoader({
    labels: {} as StocksLabels,
    locale: "en",
    searchParams: Promise.resolve(searchParams),
  });
}

function readDashboardProps(dashboard: Awaited<ReturnType<typeof loadDashboard>>) {
  return dashboard.props as ComponentProps<typeof StockDashboard>;
}

function readQuotedSymbols() {
  return data.getStockSeries.mock.calls.map(function readSymbol([stock]) {
    return stock.symbol;
  });
}

describe("stock dashboard loading", function () {
  it("quotes the watchlist in the URL without waiting for search suggestions", async function () {
    const suggestions = Promise.withResolvers<StockIdentity[]>();
    data.searchStockSymbols.mockReturnValue(suggestions.promise);
    const dashboard = await loadDashboard({ list: "MSFT,NVDA", q: "Tesla" });
    try {
      expect(readQuotedSymbols()).toEqual(["MSFT", "NVDA"]);
      await expect(readDashboardProps(dashboard).quotes).resolves.toEqual({});
    } finally {
      suggestions.resolve([]);
    }
  });

  it("still limits symbols outside the built-in set on in-app navigation requests", async function () {
    request.headers = new Headers({ rsc: "1" });
    request.limitedScopes.add("stocks-navigation");
    const dashboard = await loadDashboard({ list: "MSFT,ZZZZ", symbol: "QQQQ" });
    await expect(readDashboardProps(dashboard).detail).resolves.toBeNull();
    await readDashboardProps(dashboard).quotes;
    expect(readQuotedSymbols()).toEqual(["MSFT"]);
    expect(data.searchStockSymbols).not.toHaveBeenCalled();
  });

  it("limits symbols outside the built-in set when a shared link is opened", async function () {
    request.limitedScopes.add("stocks-shared-link");
    const dashboard = await loadDashboard({ list: "ZZZZ,AAPL" });
    await readDashboardProps(dashboard).quotes;
    expect(readQuotedSymbols()).toEqual(["AAPL"]);
  });

  it("quotes built-in symbols without consulting the limit", async function () {
    const dashboard = await loadDashboard({ list: "AAPL,MSFT", symbol: "NVDA" });
    await readDashboardProps(dashboard).quotes;
    await readDashboardProps(dashboard).detail;
    expect(request.isRateLimited).not.toHaveBeenCalled();
  });

  it("returns no suggestions without searching upstream once searches are limited", async function () {
    request.limitedScopes.add("stocks-search");
    const dashboard = await loadDashboard({ q: "Tesla" });
    await expect(readDashboardProps(dashboard).searchResults).resolves.toEqual([]);
    expect(data.searchStockSymbols).not.toHaveBeenCalled();
  });
});
