import { describe, expect, it, vi } from "vitest";

import type { StockIdentity, StockSeries, StocksLabels } from "./types";

import { StockDashboardLoader } from "./stock-dashboard-loader";

const data = vi.hoisted(function createDataMocks() {
  return {
    searchStockSymbols: vi.fn<(query: string) => Promise<StockIdentity[]>>(),
    getStockSeries: vi.fn<() => Promise<StockSeries>>(),
  };
});
vi.mock("../../lib/stocks/market-data", function mockData() {
  return data;
});

describe("stock dashboard loading", function () {
  it("starts the chart request without waiting for independent search suggestions", async function () {
    const suggestions = Promise.withResolvers<StockIdentity[]>();
    data.searchStockSymbols.mockReturnValue(suggestions.promise);
    data.getStockSeries.mockRejectedValue(new Error("Market data unavailable"));
    const dashboard = StockDashboardLoader({
      initialSymbol: null,
      initialTimeframe: "1M",
      labels: {} as StocksLabels,
      locale: "en",
      query: "Tesla",
    });
    try {
      await vi.waitFor(function chartStarted() {
        expect(data.getStockSeries).toHaveBeenCalled();
      });
    } finally {
      suggestions.resolve([]);
      await dashboard;
    }
  });
});
