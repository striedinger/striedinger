"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";

import type { StockIdentity, StockSeries, StocksLabels, StockTimeframe } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";
import { readStoredValue, removeStoredValue, writeStoredValue } from "../../../lib/browser-storage";
import { getNumberFormat } from "../../../lib/intl-cache";
import { playStockHaptic } from "./haptics";
import { MarketSessionIndicator } from "./market-session-indicator";
import { StockChart } from "./stock-chart";
import { defaultStocks, spaceXStock } from "./stock-defaults";
import { StockSearch } from "./stock-search";
import { StockSearchFallback } from "./stock-search-fallback";
import { stockTimeframeFreshnessSeconds, stockTimeframes } from "./types";

interface StockDashboardProps {
  initialSeries: StockSeries | null;
  initialStock: StockIdentity;
  initialTimeframe: StockTimeframe;
  isSharedSelection: boolean;
  labels: StocksLabels;
  locale: string;
  searchQuery: string;
  searchResults: Promise<StockIdentity[]>;
}

const storageKey = "stocks-watchlist:v1";
const previousDefaultSymbols = new Set(["AAPL", "MSFT", "NVDA"]);
export function StockDashboard({
  initialSeries,
  initialStock,
  initialTimeframe,
  isSharedSelection,
  labels,
  locale,
  searchQuery,
  searchResults,
}: StockDashboardProps) {
  const router = useRouter();
  // Staying on the current path keeps a localized page (such as /es/stocks) in its language.
  const pathname = usePathname();
  const [watchlist, setWatchlist] = useState<StockIdentity[]>(defaultStocks);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [isNavigating, startNavigation] = useTransition();
  const lastRefreshAt = useRef(0);
  const selectedStock = initialStock;
  const timeframe = initialTimeframe;
  const displayedSeries = initialSeries;

  useEffect(
    function restoreWatchlist() {
      const timeoutId = window.setTimeout(function readStoredWatchlist() {
        try {
          const storedValue = readStoredValue(storageKey);
          if (!storedValue) return;
          const parsedValue = JSON.parse(storedValue) as unknown;
          if (!Array.isArray(parsedValue)) return;
          const validStocks = parsedValue.filter(isStockIdentity).slice(0, 30);
          if (validStocks.length > 0 || parsedValue.length === 0) {
            const restoredStocks = isPreviousDefaultWatchlist(validStocks)
              ? [...validStocks, spaceXStock]
              : validStocks;
            setWatchlist(restoredStocks);
            if (
              !isSharedSelection &&
              restoredStocks[0] &&
              restoredStocks[0].symbol !== selectedStock.symbol
            ) {
              const restoredStock = restoredStocks[0]!;
              const parameters = new URLSearchParams({
                symbol: restoredStock.symbol,
                timeframe,
              });
              startNavigation(function restoreServerSelection() {
                router.replace(`${pathname}?${parameters}`, { scroll: false });
              });
            }
            if (restoredStocks !== validStocks) {
              writeStoredValue(storageKey, JSON.stringify(restoredStocks));
            }
          }
        } catch {
          removeStoredValue(storageKey);
        }
      }, 0);
      return function cancelStoredWatchlistRead() {
        window.clearTimeout(timeoutId);
      };
    },
    [isSharedSelection, pathname, router, selectedStock.symbol, timeframe],
  );

  useEffect(
    function refreshServerComponentOnRefocus() {
      lastRefreshAt.current = Date.now();
      function refreshIfStale() {
        if (document.visibilityState !== "visible") return;
        const now = Date.now();
        if (now - lastRefreshAt.current < stockTimeframeFreshnessSeconds[timeframe] * 1_000) return;
        lastRefreshAt.current = now;
        startNavigation(function refreshSelection() {
          router.refresh();
        });
      }

      function refreshWhenVisible() {
        if (document.visibilityState === "visible") refreshIfStale();
      }

      window.addEventListener("focus", refreshIfStale);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      return function removeRefocusListeners() {
        window.removeEventListener("focus", refreshIfStale);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    },
    [router, timeframe],
  );

  function navigateToSelection(symbol: string, nextTimeframe: StockTimeframe, replace = false) {
    const parameters = new URLSearchParams({ symbol, timeframe: nextTimeframe });
    startNavigation(function navigate() {
      if (replace) router.replace(`${pathname}?${parameters}`, { scroll: false });
      else router.push(`${pathname}?${parameters}`, { scroll: false });
    });
  }

  function persistWatchlist(nextWatchlist: StockIdentity[]) {
    setWatchlist(nextWatchlist);
    writeStoredValue(storageKey, JSON.stringify(nextWatchlist));
  }

  function addStock(stock: StockIdentity) {
    const alreadyAdded = watchlist.some(function hasSymbol(item) {
      return item.symbol === stock.symbol;
    });
    if (!alreadyAdded) persistWatchlist([...watchlist, stock]);
    setShareStatus("idle");
    if (stock.symbol !== selectedStock.symbol || searchQuery) {
      navigateToSelection(stock.symbol, timeframe);
    }
    playStockHaptic(alreadyAdded ? "select" : "success");
  }

  function removeStock(stock: StockIdentity) {
    const nextWatchlist = watchlist.filter(function keepOtherStock(item) {
      return item.symbol !== stock.symbol;
    });
    persistWatchlist(nextWatchlist);
    if (selectedStock.symbol === stock.symbol && nextWatchlist[0]) {
      setShareStatus("idle");
      navigateToSelection(nextWatchlist[0].symbol, timeframe);
    }
    playStockHaptic("remove");
  }

  async function shareSelection() {
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", selectedStock.symbol);
    url.searchParams.set("timeframe", timeframe);
    const shareData = {
      title: `${selectedStock.symbol} · ${labels.title}`,
      url: url.toString(),
    };
    if ("share" in navigator) {
      try {
        await navigator.share(shareData);
        playStockHaptic("success");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setShareStatus("copied");
      playStockHaptic("success");
    } catch {
      return;
    }
  }

  const latestPoint = displayedSeries?.points.at(-1);
  const firstPoint = displayedSeries?.points[0];
  const change = latestPoint && firstPoint ? latestPoint.close - firstPoint.close : 0;
  const changePercent = firstPoint ? (change / firstPoint.close) * 100 : 0;
  const priceFormatter = getNumberFormat(locale, {
    style: "currency",
    currency: displayedSeries?.identity.currency ?? selectedStock.currency,
    maximumFractionDigits: 2,
  });

  const isUp = change >= 0;

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="lg:col-span-2">
        <Suspense fallback={<StockSearchFallback labels={labels} query={searchQuery} />}>
          <StockSearch
            initialQuery={searchQuery}
            labels={labels}
            searchResults={searchResults}
            selectedSymbol={selectedStock.symbol}
            timeframe={timeframe}
            watchlist={watchlist}
            onSelectStock={addStock}
          />
        </Suspense>
      </div>

      <section
        aria-labelledby="stock-heading"
        className="flex min-w-0 flex-col gap-4 rounded-ios-xl bg-ios-grouped-cell p-4 sm:p-5 lg:order-2"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Text as="h2" id="stock-heading" className="text-ios-title1 font-bold text-ios-label">
                {selectedStock.symbol}
              </Text>
              <MarketSessionIndicator
                exchange={selectedStock.exchange}
                labels={{
                  afterHours: labels.afterHours,
                  closed: labels.marketClosed,
                  open: labels.marketOpen,
                  preMarket: labels.preMarket,
                }}
              />
              {displayedSeries?.isDemo ? (
                <Text
                  as="span"
                  className="rounded-full bg-ios-fill px-2 py-0.5 text-ios-caption1 font-semibold text-ios-secondary-label"
                >
                  {labels.demo}
                </Text>
              ) : null}
            </div>
            <Text numberOfLines={1} className="text-ios-subheadline text-ios-secondary-label">
              {selectedStock.name} · {selectedStock.exchange}
            </Text>
          </div>
          <IosBarButton
            aria-label={labels.share}
            className="text-ios-tint"
            onClick={shareSelection}
          >
            <ShareUpIcon />
          </IosBarButton>
          <span className="sr-only" aria-live="polite">
            {shareStatus === "copied" ? labels.copied : ""}
          </span>
        </header>

        {latestPoint ? (
          <div className="flex items-baseline gap-3">
            <Text className="text-ios-large-title font-bold tracking-[0.37px] text-ios-label tabular-nums">
              {priceFormatter.format(latestPoint.close)}
            </Text>
            <Text
              className={cn(
                "rounded-ios-sm px-2 py-0.5 text-ios-subheadline font-semibold text-white tabular-nums",
                isUp ? "bg-ios-green" : "bg-ios-red",
              )}
            >
              {isUp ? "+" : ""}
              {priceFormatter.format(change)} ({changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </Text>
          </div>
        ) : null}

        <IosSegmentedControl
          label={labels.chart}
          options={stockTimeframes.map(function createOption(option) {
            return { label: option, value: option };
          })}
          value={timeframe}
          onChange={function selectTimeframe(option) {
            setShareStatus("idle");
            navigateToSelection(selectedStock.symbol, option);
            playStockHaptic("select");
          }}
        />

        {!displayedSeries ? (
          <div
            role="alert"
            className="aspect-1.5/1 flex items-center justify-center rounded-ios-lg bg-ios-grouped-background p-6 text-center sm:aspect-[2.35/1]"
          >
            <Text className="text-ios-subheadline text-ios-secondary-label">
              {labels.dataUnavailable}
            </Text>
          </div>
        ) : (
          <div
            aria-busy={isNavigating}
            className="relative transition-opacity duration-200 aria-busy:opacity-60 motion-reduce:transition-none"
          >
            <StockChart
              key={`${selectedStock.symbol}-${displayedSeries.timeframe}`}
              currency={displayedSeries.identity.currency}
              labels={labels}
              locale={locale}
              points={displayedSeries.points}
              symbol={selectedStock.symbol}
              timeframe={displayedSeries.timeframe}
            />
            {isNavigating ? (
              <Text
                role="status"
                className="pointer-events-none absolute top-0 right-0 rounded-full bg-ios-menu px-3 py-1 text-ios-footnote text-ios-secondary-label backdrop-blur-[20px]"
              >
                {labels.loading}
              </Text>
            ) : null}
          </div>
        )}

        {latestPoint ? (
          <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-ios-lg bg-ios-separator sm:grid-cols-4">
            {[
              [labels.open, priceFormatter.format(latestPoint.open)],
              [labels.high, priceFormatter.format(latestPoint.high)],
              [labels.low, priceFormatter.format(latestPoint.low)],
              [
                labels.volume,
                getNumberFormat(locale, { notation: "compact" }).format(latestPoint.volume),
              ],
            ].map(function renderStat([label, value]) {
              return (
                <div key={label} className="flex flex-col bg-ios-grouped-background px-3.5 py-2.5">
                  <Text as="dt" className="text-ios-footnote text-ios-secondary-label">
                    {label}
                  </Text>
                  <Text
                    as="dd"
                    className="m-0 text-ios-body font-semibold text-ios-label tabular-nums"
                  >
                    {value}
                  </Text>
                </div>
              );
            })}
          </dl>
        ) : null}
        <Text className="text-ios-caption1 text-ios-secondary-label">{labels.attribution}</Text>
      </section>

      <section aria-label={labels.watchlist} className="flex min-w-0 flex-col lg:order-1">
        <div className="flex items-center justify-between px-4 pb-1.5">
          <Text as="h2" className="text-ios-title2 font-bold text-ios-label">
            {labels.watchlist}
          </Text>
          <Text as="span" className="text-ios-subheadline text-ios-secondary-label tabular-nums">
            {watchlist.length}
          </Text>
        </div>
        {watchlist.length > 0 ? (
          <ul className="m-0 list-none overflow-hidden rounded-ios-xl bg-ios-grouped-cell p-0">
            {watchlist.map(function renderWatchlistStock(stock) {
              const isSelected = stock.symbol === selectedStock.symbol;
              return (
                <li
                  key={stock.symbol}
                  className={cn(
                    "relative flex items-center transition-colors duration-150 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator motion-reduce:transition-none",
                    isSelected && "bg-ios-tint/10",
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className="flex min-h-14.5 min-w-0 flex-1 flex-col justify-center py-2 pr-2 pl-4 text-left outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed"
                    onClick={function selectWatchlistStock() {
                      setShareStatus("idle");
                      if (!isSelected) navigateToSelection(stock.symbol, timeframe);
                      playStockHaptic("select");
                    }}
                  >
                    <Text
                      as="span"
                      className={cn(
                        "text-ios-body font-semibold",
                        isSelected ? "text-ios-tint" : "text-ios-label",
                      )}
                    >
                      {stock.symbol}
                    </Text>
                    <Text
                      as="span"
                      numberOfLines={1}
                      className="text-ios-footnote text-ios-secondary-label"
                    >
                      {stock.name}
                    </Text>
                  </button>
                  <button
                    type="button"
                    aria-label={`${labels.remove} ${stock.symbol}`}
                    className="mr-3 flex size-7 shrink-0 items-center justify-center rounded-full bg-ios-fill text-ios-secondary-label outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 [&_svg]:size-3"
                    onClick={function removeWatchlistStock(event) {
                      event.stopPropagation();
                      removeStock(stock);
                    }}
                  >
                    <CloseIcon strokeWidth={2.8} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Text className="rounded-ios-xl bg-ios-grouped-cell px-4 py-6 text-center text-ios-subheadline text-ios-secondary-label">
            {labels.emptyWatchlist}
          </Text>
        )}
      </section>
    </div>
  );
}

function isStockIdentity(value: unknown): value is StockIdentity {
  if (!value || typeof value !== "object") return false;
  const stock = value as Partial<StockIdentity>;
  return (
    typeof stock.symbol === "string" &&
    /^[A-Z0-9.:-]{1,20}$/.test(stock.symbol) &&
    typeof stock.name === "string" &&
    typeof stock.exchange === "string" &&
    typeof stock.currency === "string" &&
    /^[A-Z]{3}$/.test(stock.currency)
  );
}

function isPreviousDefaultWatchlist(stocks: StockIdentity[]) {
  return (
    stocks.length === previousDefaultSymbols.size &&
    stocks.every(function isPreviousDefault(stock) {
      return previousDefaultSymbols.has(stock.symbol);
    })
  );
}
