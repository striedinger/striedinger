import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StockSeries, StocksLabels } from "./types";

import { StockDashboard } from "./stock-dashboard";

const navigationMocks = vi.hoisted(function createNavigationMocks() {
  return {
    push: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
    refresh: vi.fn<() => void>(),
    replace: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return { usePathname: () => "/stocks", useRouter: () => navigationMocks };
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

  afterEach(function restoreTimers() {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("restores an intentionally empty watchlist", async function () {
    vi.useFakeTimers();
    window.localStorage.setItem("stocks-watchlist:v1", "[]");
    await renderDashboard();
    act(function restoreWatchlist() {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText(labels.emptyWatchlist)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove AAPL" })).not.toBeInTheDocument();
  });

  it("still navigates after removing a stock when persistence fails", async function () {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function denyWrite() {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Remove AAPL" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/stocks?symbol=MSFT&timeframe=1M", {
      scroll: false,
    });
  });

  it("does not enter a loading state when the selected timeframe is pressed again", async function () {
    await renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "1M" }));

    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("status", { name: labels.loading })).not.toBeInTheDocument();
  });

  it("keeps the chart visible while a timeframe navigation is requested", async function () {
    await renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "1W" }));

    expect(screen.getByRole("slider", { name: "AAPL Chart" })).toBeInTheDocument();
    expect(navigationMocks.push).toHaveBeenCalledWith("/stocks?symbol=AAPL&timeframe=1W", {
      scroll: false,
    });
  });

  it("requests server suggestions while typing without requiring a submit button", async function () {
    vi.useFakeTimers();
    await renderDashboard();

    fireEvent.change(screen.getByRole("combobox", { name: labels.search }), {
      target: { value: "Tesla" },
    });
    act(function finishSearchDelay() {
      vi.advanceTimersByTime(180);
    });

    expect(screen.queryByRole("button", { name: labels.search })).not.toBeInTheDocument();
    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/stocks?symbol=AAPL&timeframe=1M&q=Tesla",
      { scroll: false },
    );

    fireEvent.click(screen.getByRole("button", { name: labels.close }));
    expect(navigationMocks.replace).toHaveBeenLastCalledWith("/stocks?symbol=AAPL&timeframe=1M", {
      scroll: false,
    });
  });

  it("supports choosing a typeahead result with the keyboard", async function () {
    await renderDashboard({ searchQuery: "app", searchResults: [apple] });
    const searchInput = screen.getByRole("combobox", { name: labels.search });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(searchInput).toHaveValue("");
    expect(navigationMocks.push).toHaveBeenCalledWith("/stocks?symbol=AAPL&timeframe=1M", {
      scroll: false,
    });
  });

  it("removes a stock from the watchlist with an always-available control", async function () {
    await renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: `${labels.remove} AAPL` }));

    expect(screen.queryByRole("button", { name: `${labels.remove} AAPL` })).not.toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem("stocks-watchlist:v1") ?? "[]"),
    ).not.toContainEqual(expect.objectContaining({ symbol: "AAPL" }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/stocks?symbol=MSFT&timeframe=1M", {
      scroll: false,
    });
  });
});

async function renderDashboard({
  searchQuery = "",
  searchResults = [],
}: {
  searchQuery?: string;
  searchResults?: (typeof apple)[];
} = {}) {
  await act(async function renderWithStreamedSuggestions() {
    render(
      <StockDashboard
        initialSeries={initialSeries}
        initialStock={apple}
        initialTimeframe="1M"
        isSharedSelection
        labels={labels}
        locale="en-US"
        searchQuery={searchQuery}
        searchResults={Promise.resolve(searchResults)}
      />,
    );
  });
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
