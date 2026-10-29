import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StockDetail, StockQuote, StocksLabels } from "./types";

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

const apple = { symbol: "AAPL", name: "Apple", exchange: "NASDAQ", currency: "USD" };
const tesla = { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", currency: "USD" };

const labels: StocksLabels = {
  added: "Added",
  addToWatchlist: "Add to Watchlist",
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
  remove: "Remove",
  search: "Search stocks",
  searchHelp: "Search help",
  searchPlaceholder: "Search by company or ticker",
  share: "Share chart",
  title: "Stocks",
  toggleChange: "Switch change",
  volume: "Volume",
  watchlist: "Watchlist",
};

const appleQuote: StockQuote = {
  change: 2,
  changePercent: 1,
  currency: "USD",
  price: 202,
  sparkline: [200, 201, 202],
  symbol: "AAPL",
};

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

  it("keeps the URL as it is for the default watchlist", async function () {
    await renderDashboard();
    expect(screen.getByRole("button", { name: /^AAPL/ })).toBeInTheDocument();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("mirrors a saved watchlist into the URL so the server quotes it", async function () {
    window.localStorage.setItem("stocks-watchlist:v1", JSON.stringify([tesla]));
    await renderDashboard();
    expect(screen.getByRole("button", { name: /^TSLA/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^AAPL/ })).not.toBeInTheDocument();
    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?list=TSLA", { scroll: false });
  });

  it("restores an intentionally empty watchlist", async function () {
    window.localStorage.setItem("stocks-watchlist:v1", "[]");
    await renderDashboard();
    expect(screen.getByText(labels.emptyWatchlist)).toBeInTheDocument();
    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?list=", { scroll: false });
  });

  it("switches every row between the percentage and the price change", async function () {
    await renderDashboard();
    const change = screen.getByRole("button", { name: `+1.00%. ${labels.toggleChange}` });

    fireEvent.click(change);

    expect(screen.getByRole("button", { name: `+2.00. ${labels.toggleChange}` })).toBe(change);
  });

  it("removes a stock from its row's menu and updates the URL", async function () {
    await renderDashboard();

    fireEvent.contextMenu(screen.getByRole("button", { name: /^AAPL/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: `${labels.remove} AAPL` }));

    expect(screen.queryByRole("button", { name: /^AAPL/ })).not.toBeInTheDocument();
    expect(readStoredWatchlist()).not.toContainEqual(expect.objectContaining({ symbol: "AAPL" }));
    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?list=MSFT,NVDA,SPCX", {
      scroll: false,
    });
  });

  it("opens a tapped stock in the URL and in a sheet", async function () {
    await renderDashboard();

    // oxlint-disable-next-line typescript/require-await -- an async act callback lets the sheet's transition finish before assertions run
    await act(async function openStock() {
      fireEvent.click(screen.getByRole("button", { name: /^AAPL/ }));
    });

    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?symbol=AAPL", {
      scroll: false,
    });
    expect(await screen.findByRole("dialog")).toHaveTextContent("Apple");
  });

  it("changes the open stock's timeframe and adds a stock from its sheet", async function () {
    await renderDashboard({
      detail: { stock: tesla, series: null },
      selectedSymbol: "TSLA",
    });

    fireEvent.click(await screen.findByRole("button", { name: "1W" }));
    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?symbol=TSLA&timeframe=1W", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("button", { name: labels.addToWatchlist }));
    expect(readStoredWatchlist()).toContainEqual(tesla);
  });

  it("requests server suggestions while typing", async function () {
    vi.useFakeTimers();
    await renderDashboard();

    fireEvent.change(screen.getByRole("combobox", { name: labels.search }), {
      target: { value: "Tesla" },
    });
    act(function finishSearchDelay() {
      vi.advanceTimersByTime(180);
    });

    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?q=Tesla", { scroll: false });

    fireEvent.click(screen.getByRole("button", { name: labels.close }));
    expect(navigationMocks.replace).toHaveBeenLastCalledWith("/stocks", { scroll: false });
  });

  it("opens a search result chosen with the keyboard", async function () {
    await renderDashboard({ searchQuery: "tes", searchResults: [tesla] });
    const searchInput = screen.getByRole("combobox", { name: labels.search });

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(searchInput).toHaveValue("");
    expect(navigationMocks.replace).toHaveBeenCalledWith("/stocks?symbol=TSLA", {
      scroll: false,
    });
  });
});

function readStoredWatchlist(): unknown {
  const storedValue = window.localStorage.getItem("stocks-watchlist:v1");
  if (storedValue === null) throw new Error("Expected a stored watchlist");
  return JSON.parse(storedValue) as unknown;
}

async function renderDashboard({
  detail = null,
  searchQuery = "",
  searchResults = [],
  selectedSymbol = null,
}: {
  detail?: StockDetail | null;
  searchQuery?: string;
  searchResults?: (typeof apple)[];
  selectedSymbol?: string | null;
} = {}) {
  // oxlint-disable-next-line typescript/require-await -- an async act callback flushes the streamed promises before assertions run
  await act(async function renderWithStreamedData() {
    render(
      <StockDashboard
        detail={Promise.resolve(detail)}
        labels={labels}
        listParameter={null}
        locale="en-US"
        quotes={Promise.resolve({ AAPL: appleQuote })}
        searchQuery={searchQuery}
        searchResults={Promise.resolve(searchResults)}
        selectedSymbol={selectedSymbol}
        timeframe="1D"
      />,
    );
  });
}
