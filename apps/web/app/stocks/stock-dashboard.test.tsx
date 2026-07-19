import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StockSeries, StocksLabels } from "./types";

import { StockDashboard } from "./stock-dashboard";

const navigationMocks = vi.hoisted(function createNavigationMocks() {
  return {
    push: vi.fn<(href: string) => void>(),
    refresh: vi.fn<() => void>(),
    replace: vi.fn<(href: string) => void>(),
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return { useRouter: () => navigationMocks };
});

vi.mock("./haptics", function mockStockHaptics() {
  return { playStockHaptic: vi.fn<(pattern: "select" | "success" | "remove") => void>() };
});

const apple = {
  symbol: "AAPL",
  name: "Apple",
  exchange: "NASDAQ",
  currency: "USD",
};

const labels: StocksLabels = {
  add: "Add",
  added: "Added",
  afterHours: "After hours",
  attribution: "Attribution",
  chart: "Chart",
  chartHelp: "Inspect prices",
  close: "Close",
  copied: "Link copied",
  dataUnavailable: "Market data unavailable",
  demo: "Demo data",
  description: "Description",
  emptyWatchlist: "Empty watchlist",
  high: "High",
  loading: "Loading market data",
  low: "Low",
  marketClosed: "Market closed",
  marketOpen: "Market open",
  open: "Open",
  preMarket: "Pre-market",
  price: "Price",
  rangeHelp: "Select a range",
  remove: "Remove",
  resetZoom: "Reset zoom",
  search: "Search stocks",
  searchHelp: "Search help",
  searchPlaceholder: "Search by company or ticker",
  share: "Share chart",
  title: "Stock watchlist",
  volume: "Volume",
  watchlist: "Watchlist",
};

const initialSeries = createSeries("1M", 100);

describe("StockDashboard", function () {
  beforeEach(function resetDashboard() {
    window.localStorage.clear();
    navigationMocks.push.mockClear();
    navigationMocks.refresh.mockClear();
    navigationMocks.replace.mockClear();
  });

  it("does not enter a loading state when the selected timeframe is pressed again", function () {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "1M" }));

    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("status", { name: labels.loading })).not.toBeInTheDocument();
  });

  it("keeps the chart visible while a timeframe navigation is requested", function () {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "1W" }));

    expect(screen.getByRole("slider", { name: "AAPL Chart" })).toBeInTheDocument();
    expect(navigationMocks.push).toHaveBeenCalledWith("/stocks?symbol=AAPL&timeframe=1W");
  });
});

function renderDashboard() {
  render(
    <StockDashboard
      initialSeries={initialSeries}
      initialStock={apple}
      initialTimeframe="1M"
      isSharedSelection
      labels={labels}
      locale="en-US"
      searchQuery=""
      searchResults={[]}
    />,
  );
}

function createSeries(timeframe: StockSeries["timeframe"], close: number): StockSeries {
  return {
    identity: apple,
    isDemo: false,
    timeframe,
    points: [
      {
        close,
        date: "2026-07-17T16:00:00.000Z",
        high: close + 2,
        low: close - 2,
        open: close - 1,
        volume: 1_000_000,
      },
    ],
  };
}
