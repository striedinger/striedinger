"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { ShareIcon } from "@workspace/icons/share-icon";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { StockIdentity, StockSeries, StocksLabels, StockTimeframe } from "./types";

import { playStockHaptic } from "./haptics";
import { MarketSessionIndicator } from "./market-session-indicator";
import { StockChart } from "./stock-chart";
import { defaultStocks, spaceXStock } from "./stock-defaults";
import { StockSearch } from "./stock-search";
import { stockTimeframeFreshnessSeconds, stockTimeframes } from "./types";

interface StockDashboardProps {
  initialSeries: StockSeries | null;
  initialStock: StockIdentity;
  initialTimeframe: StockTimeframe;
  isSharedSelection: boolean;
  labels: StocksLabels;
  locale: string;
  searchQuery: string;
  searchResults: StockIdentity[];
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
          const storedValue = window.localStorage.getItem(storageKey);
          if (!storedValue) return;
          const parsedValue = JSON.parse(storedValue) as unknown;
          if (!Array.isArray(parsedValue)) return;
          const validStocks = parsedValue.filter(isStockIdentity).slice(0, 30);
          if (validStocks.length > 0) {
            const restoredStocks = isPreviousDefaultWatchlist(validStocks)
              ? [...validStocks, spaceXStock]
              : validStocks;
            setWatchlist(restoredStocks);
            if (!isSharedSelection && restoredStocks[0]?.symbol !== selectedStock.symbol) {
              const restoredStock = restoredStocks[0]!;
              const parameters = new URLSearchParams({
                symbol: restoredStock.symbol,
                timeframe,
              });
              startNavigation(function restoreServerSelection() {
                router.replace(`/stocks?${parameters}`, { scroll: false });
              });
            }
            if (restoredStocks !== validStocks) {
              window.localStorage.setItem(storageKey, JSON.stringify(restoredStocks));
            }
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }, 0);
      return function cancelStoredWatchlistRead() {
        window.clearTimeout(timeoutId);
      };
    },
    [isSharedSelection, router, selectedStock.symbol, timeframe],
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
      if (replace) router.replace(`/stocks?${parameters}`, { scroll: false });
      else router.push(`/stocks?${parameters}`, { scroll: false });
    });
  }

  function persistWatchlist(nextWatchlist: StockIdentity[]) {
    setWatchlist(nextWatchlist);
    window.localStorage.setItem(storageKey, JSON.stringify(nextWatchlist));
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
  const priceFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: displayedSeries?.identity.currency ?? selectedStock.currency,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-5" aria-label={labels.watchlist}>
        <StockSearch
          initialQuery={searchQuery}
          labels={labels}
          searchResults={searchResults}
          selectedSymbol={selectedStock.symbol}
          timeframe={timeframe}
          watchlist={watchlist}
          onSelectStock={addStock}
        />

        <Surface className="overflow-hidden p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <Text as="h2" size="xs" weight="bold" className="tracking-[0.15em] uppercase">
              {labels.watchlist}
            </Text>
            <Text as="span" size="xs" tone="muted" className="tabular-nums">
              {watchlist.length}
            </Text>
          </div>
          {watchlist.length > 0 ? (
            <ul className="flex list-none gap-1 overflow-x-auto p-0 lg:flex-col lg:overflow-visible">
              {watchlist.map(function renderWatchlistStock(stock) {
                const isSelected = stock.symbol === selectedStock.symbol;
                return (
                  <li key={stock.symbol} className="relative min-w-36 lg:min-w-0">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className="flex w-full flex-col rounded-xl py-3 pr-10 pl-3 text-left transition-[background-color,transform] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transform-none"
                      onClick={function selectWatchlistStock() {
                        setShareStatus("idle");
                        if (!isSelected) navigateToSelection(stock.symbol, timeframe);
                        playStockHaptic("select");
                      }}
                    >
                      <Text as="span" size="sm" weight="semibold" className="text-inherit">
                        {stock.symbol}
                      </Text>
                      <Text
                        as="span"
                        size="xs"
                        numberOfLines={1}
                        className={
                          isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                        }
                      >
                        {stock.name}
                      </Text>
                    </button>
                    <button
                      type="button"
                      aria-label={`${labels.remove} ${stock.symbol}`}
                      className={`absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring ${isSelected ? "text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
                      onClick={function removeWatchlistStock(event) {
                        event.stopPropagation();
                        removeStock(stock);
                      }}
                    >
                      <CloseIcon className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Text size="sm" tone="muted" className="px-3 py-6 text-center">
              {labels.emptyWatchlist}
            </Text>
          )}
        </Surface>
      </aside>

      <Surface
        as="section"
        className="min-w-0 overflow-hidden p-4 sm:p-6"
        aria-labelledby="stock-heading"
      >
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Text as="h2" id="stock-heading" size="2xl" weight="semibold">
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
                    size="xs"
                    weight="medium"
                    className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
                  >
                    {labels.demo}
                  </Text>
                ) : null}
              </div>
              <Text size="sm" tone="muted" numberOfLines={1}>
                {selectedStock.name} · {selectedStock.exchange}
              </Text>
            </div>
            <div className="flex items-start gap-3">
              {latestPoint ? (
                <div className="text-right">
                  <Text size="2xl" weight="semibold" className="tabular-nums">
                    {priceFormatter.format(latestPoint.close)}
                  </Text>
                  <Text
                    size="sm"
                    weight="medium"
                    className={`tabular-nums ${change >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {priceFormatter.format(change)} ({changePercent >= 0 ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                  </Text>
                </div>
              ) : null}
              <Button
                type="button"
                size="icon-lg"
                variant="outline"
                aria-label={labels.share}
                className="size-11"
                onClick={shareSelection}
              >
                <ShareIcon />
              </Button>
              <span className="sr-only" aria-live="polite">
                {shareStatus === "copied" ? labels.copied : ""}
              </span>
            </div>
          </header>

          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1"
            role="group"
            aria-label={labels.chart}
          >
            {stockTimeframes.map(function renderTimeframe(option) {
              return (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={timeframe === option ? "default" : "ghost"}
                  aria-pressed={timeframe === option}
                  className="min-w-11 flex-1 rounded-lg"
                  onClick={function selectTimeframe() {
                    if (timeframe === option) return;
                    setShareStatus("idle");
                    navigateToSelection(selectedStock.symbol, option);
                    playStockHaptic("select");
                  }}
                >
                  {option}
                </Button>
              );
            })}
          </div>

          {!displayedSeries ? (
            <div
              className="flex min-h-[calc(4.5rem+0.75rem)] flex-col justify-end gap-3"
              role="alert"
            >
              <div className="h-[4.5rem] sm:h-12" />
              <div className="flex aspect-[1.5/1] items-center justify-center rounded-xl border border-dashed p-6 text-center sm:aspect-[2.35/1]">
                <Text size="sm" tone="muted">
                  {labels.dataUnavailable}
                </Text>
              </div>
            </div>
          ) : (
            <div className="relative" aria-busy={isNavigating}>
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
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl bg-card/15"
                  role="status"
                >
                  <span className="absolute inset-x-0 top-0 h-1 animate-pulse bg-primary/70 motion-reduce:animate-none" />
                  <Text
                    size="sm"
                    tone="muted"
                    className="absolute top-3 right-3 rounded-full bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur-sm"
                  >
                    {labels.loading}
                  </Text>
                </div>
              ) : null}
            </div>
          )}

          {latestPoint ? (
            <dl className="grid grid-cols-2 gap-3 border-t pt-5 sm:grid-cols-4">
              {[
                [labels.open, priceFormatter.format(latestPoint.open)],
                [labels.high, priceFormatter.format(latestPoint.high)],
                [labels.low, priceFormatter.format(latestPoint.low)],
                [
                  labels.volume,
                  new Intl.NumberFormat(locale, { notation: "compact" }).format(latestPoint.volume),
                ],
              ].map(function renderStat([label, value]) {
                return (
                  <div key={label}>
                    <Text as="dt" size="xs" tone="muted">
                      {label}
                    </Text>
                    <Text as="dd" size="sm" weight="semibold" className="tabular-nums">
                      {value}
                    </Text>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </div>
      </Surface>
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
    typeof stock.currency === "string"
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
