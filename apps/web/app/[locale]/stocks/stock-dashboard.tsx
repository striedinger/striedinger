"use client";

import { Text } from "@workspace/ui/components/text";
import { usePathname, useRouter } from "next/navigation";
import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import type { StockChangeDisplay } from "./stock-quote-summary";
import type { StocksUrlState } from "./stocks-href";
import type { StockDetail, StockIdentity, StockQuote, StocksLabels, StockTimeframe } from "./types";

import { playStockHaptic } from "./haptics";
import { defaultStocks, featuredStocks } from "./stock-defaults";
import { StockSearch } from "./stock-search";
import { StockSearchFallback } from "./stock-search-fallback";
import { StockWatchlistRow } from "./stock-watchlist-row";
import { StockWatchlistRowsSkeleton } from "./stock-watchlist-rows-skeleton";
import { saveStockWatchlist, useStockWatchlist } from "./stock-watchlist-store";
import { createStocksHref } from "./stocks-href";
import { stockTimeframeFreshnessSeconds } from "./types";

const StockDetailSheet = lazy(function importStockDetailSheet() {
  return import("./stock-detail-sheet").then(function selectStockDetailSheet(module) {
    return { default: module.StockDetailSheet };
  });
});

interface StockDashboardProps {
  detail: Promise<StockDetail | null>;
  labels: StocksLabels;
  /** The watchlist the URL carries, as the server read it; `null` for the default one. */
  listParameter: string | null;
  locale: string;
  quotes: Promise<Record<string, StockQuote>>;
  searchQuery: string;
  searchResults: Promise<StockIdentity[]>;
  selectedSymbol: string | null;
  timeframe: StockTimeframe;
}

const defaultListParameter = defaultStocks.map(getSymbol).join(",");

/**
 * iOS Stocks: a search field over the watchlist, each row with today's sparkline, price, and
 * change, and a sheet for the stock a row or search result opens. The browser keeps the
 * watchlist; the page mirrors it into the URL so the server can stream its quotes.
 */
export function StockDashboard({
  detail,
  labels,
  listParameter,
  locale,
  quotes,
  searchQuery,
  searchResults,
  selectedSymbol,
  timeframe,
}: StockDashboardProps) {
  const router = useRouter();
  // Staying on the current path keeps a localized page (such as /es/stocks) in its language.
  const pathname = usePathname();
  const storedWatchlist = useStockWatchlist();
  const watchlist = storedWatchlist ?? [];
  const [changeDisplay, setChangeDisplay] = useState<StockChangeDisplay>("percent");
  const [sheetStock, setSheetStock] = useState<StockIdentity | null>(function findLinkedStock() {
    return selectedSymbol ? findKnownStock(selectedSymbol) : null;
  });
  const [isSheetOpen, setIsSheetOpen] = useState(selectedSymbol !== null);
  const [isNavigating, startNavigation] = useTransition();
  const [optimisticTimeframe, setOptimisticTimeframe] = useOptimistic(timeframe);
  const lastRefreshAt = useRef(0);
  // The saved watchlist's parameter once the browser has read it; every navigation carries it.
  const watchlistParameter =
    storedWatchlist === null ? listParameter : getListParameter(storedWatchlist);
  const urlState: StocksUrlState = {
    list: watchlistParameter,
    query: searchQuery,
    symbol: selectedSymbol,
    timeframe,
  };

  function createHref(changes: Partial<StocksUrlState>) {
    return createStocksHref(pathname, { ...urlState, ...changes });
  }

  function navigate(changes: Partial<StocksUrlState>) {
    startNavigation(function replaceUrl() {
      if (changes.timeframe) setOptimisticTimeframe(changes.timeframe);
      router.replace(createHref(changes), { scroll: false });
    });
  }

  const synchronizedHref = watchlistParameter === listParameter ? null : createHref({});

  useEffect(
    function mirrorWatchlistIntoUrl() {
      if (!synchronizedHref) return;
      // Its own transition, so quotes refreshing never dims an open chart.
      startTransition(function replaceList() {
        router.replace(synchronizedHref, { scroll: false });
      });
    },
    [router, synchronizedHref],
  );

  useEffect(
    function refreshQuotesOnRefocus() {
      lastRefreshAt.current = Date.now();
      function refreshIfStale() {
        if (document.visibilityState !== "visible") return;
        const now = Date.now();
        if (now - lastRefreshAt.current < stockTimeframeFreshnessSeconds["1D"] * 1_000) return;
        lastRefreshAt.current = now;
        startTransition(function refreshQuotes() {
          router.refresh();
        });
      }

      window.addEventListener("focus", refreshIfStale);
      document.addEventListener("visibilitychange", refreshIfStale);
      return function removeRefocusListeners() {
        window.removeEventListener("focus", refreshIfStale);
        document.removeEventListener("visibilitychange", refreshIfStale);
      };
    },
    [router],
  );

  function openStock(stock: StockIdentity) {
    setSheetStock(stock);
    setIsSheetOpen(true);
    navigate({ query: "", symbol: stock.symbol });
    playStockHaptic("select");
  }

  function addStock(stock: StockIdentity) {
    if (!watchlist.some(hasSymbol(stock.symbol))) saveStockWatchlist([...watchlist, stock]);
    playStockHaptic("success");
  }

  function removeStock(stock: StockIdentity) {
    saveStockWatchlist(
      watchlist.filter(function keepOtherStock(item) {
        return item.symbol !== stock.symbol;
      }),
    );
    playStockHaptic("remove");
  }

  function toggleChangeDisplay() {
    setChangeDisplay(changeDisplay === "percent" ? "price" : "percent");
    playStockHaptic("select");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="px-4">
        <Suspense fallback={<StockSearchFallback labels={labels} query={searchQuery} />}>
          <StockSearch
            getSearchHref={function getSearchHref(query) {
              return createHref({ query });
            }}
            initialQuery={searchQuery}
            labels={labels}
            searchResults={searchResults}
            watchlist={watchlist}
            onSelectStock={openStock}
          />
        </Suspense>
      </div>

      <section aria-label={labels.watchlist}>
        {storedWatchlist === null ? (
          <StockWatchlistRowsSkeleton />
        ) : watchlist.length > 0 ? (
          <ul className="m-0 list-none p-0">
            {watchlist.map(function renderWatchlistStock(stock) {
              return (
                <StockWatchlistRow
                  key={stock.symbol}
                  changeDisplay={changeDisplay}
                  labels={labels}
                  locale={locale}
                  quotes={quotes}
                  selected={isSheetOpen && sheetStock?.symbol === stock.symbol}
                  stock={stock}
                  onOpen={openStock}
                  onRemove={removeStock}
                  onToggleChange={toggleChangeDisplay}
                />
              );
            })}
          </ul>
        ) : (
          <Text className="px-8 py-10 text-center text-ios-subheadline text-ios-secondary-label">
            {labels.emptyWatchlist}
          </Text>
        )}
      </section>

      {sheetStock ? (
        <Suspense fallback={null}>
          <StockDetailSheet
            detail={detail}
            isInWatchlist={storedWatchlist === null || watchlist.some(hasSymbol(sheetStock.symbol))}
            isNavigating={isNavigating}
            labels={labels}
            locale={locale}
            open={isSheetOpen}
            stock={sheetStock}
            timeframe={optimisticTimeframe}
            onAdd={addStock}
            onClosed={function removeStockFromUrl() {
              navigate({ symbol: null });
            }}
            onOpenChange={setIsSheetOpen}
            onSelectTimeframe={function selectTimeframe(nextTimeframe) {
              navigate({ timeframe: nextTimeframe });
              playStockHaptic("select");
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

/** The URL's watchlist parameter for a saved watchlist, leaving the default one out. */
function getListParameter(watchlist: readonly StockIdentity[]) {
  const list = watchlist.map(getSymbol).join(",");
  return list === defaultListParameter ? null : list;
}

/** A linked stock as far as the page knows it before the server names it. */
function findKnownStock(symbol: string): StockIdentity {
  return (
    featuredStocks.find(hasSymbol(symbol)) ?? { currency: "USD", exchange: "", name: "", symbol }
  );
}

function getSymbol(stock: StockIdentity) {
  return stock.symbol;
}

function hasSymbol(symbol: string) {
  return function matchesSymbol(stock: StockIdentity) {
    return stock.symbol === symbol;
  };
}
