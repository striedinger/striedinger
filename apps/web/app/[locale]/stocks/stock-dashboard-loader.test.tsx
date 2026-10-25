import { describe, expect, it, vi } from "vitest";

import type { StockIdentity, StockSeries, StocksLabels } from "./types";

import { StockDashboardLoader } from "./stock-dashboard-loader";

const data = vi.hoisted(function createDataMocks() {
  return {
    searchStockSymbols: vi.fn<(query: string) => Promise<StockIdentity[]>>(),
    getStockSeries: vi.fn<(stock: StockIdentity) => Promise<StockSeries>>(),
  };
});
vi.mock("../../../lib/stocks/market-data", function mockData() {
  return data;
});

describe("stock dashboard loading", function () {
  it("quotes the watchlist in the URL without waiting for search suggestions", async function () {
    const suggestions = Promise.withResolvers<StockIdentity[]>();
    data.searchStockSymbols.mockReturnValue(suggestions.promise);
    data.getStockSeries.mockRejectedValue(new Error("Market data unavailable"));
    const dashboard = await StockDashboardLoader({
      labels: {} as StocksLabels,
      locale: "en",
      searchParams: Promise.resolve({ list: "MSFT,NVDA", q: "Tesla" }),
    });
    try {
      const quotedSymbols = data.getStockSeries.mock.calls.map(function readSymbol([stock]) {
        return stock.symbol;
      });
      expect(quotedSymbols).toEqual(["MSFT", "NVDA"]);
      await expect(dashboard.props.quotes).resolves.toEqual({});
    } finally {
      suggestions.resolve([]);
    }
  });
});
