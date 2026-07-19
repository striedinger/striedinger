"use client";

import { ShareIcon } from "@workspace/icons/share-icon";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { startTransition, useEffect, useRef, useState } from "react";

import type { StockIdentity, StockSeries, StocksLabels, StockTimeframe } from "./types";

import { useTypeahead } from "../../components/use-typeahead";
import { loadStockSeries, searchStocks } from "./actions";
import { playStockHaptic } from "./haptics";
import { MarketSessionIndicator } from "./market-session-indicator";
import { StockChart } from "./stock-chart";
import { defaultStocks, spaceXStock } from "./stock-defaults";
import { stockTimeframes } from "./types";

interface StockDashboardProps {
  initialStock: StockIdentity;
  initialTimeframe: StockTimeframe;
  isSharedSelection: boolean;
  labels: StocksLabels;
  locale: string;
}

const storageKey = "stocks-watchlist:v1";
const previousDefaultSymbols = new Set(["AAPL", "MSFT", "NVDA"]);
const refocusRefreshIntervalMilliseconds = 60_000;

function getStockSymbol(stock: StockIdentity) {
  return stock.symbol;
}

export function StockDashboard({
  initialStock,
  initialTimeframe,
  isSharedSelection,
  labels,
  locale,
}: StockDashboardProps) {
  const [watchlist, setWatchlist] = useState<StockIdentity[]>(defaultStocks);
  const [selectedStock, setSelectedStock] = useState<StockIdentity>(initialStock);
  const [timeframe, setTimeframe] = useState<StockTimeframe>(initialTimeframe);
  const [series, setSeries] = useState<StockSeries | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const requestNumber = useRef(0);
  const lastSeriesRequestAt = useRef(0);
  const typeahead = useTypeahead({
    clearQueryOnSelect: true,
    getItemLabel: getStockSymbol,
    loadSuggestions: searchStocks,
    maximumSuggestions: 8,
    minimumQueryLength: 1,
    onSelect: addStock,
    suggestionDelayMilliseconds: 250,
  });
  const {
    activeSuggestionIndex,
    clear,
    handleKeyDown,
    open,
    query,
    selectSuggestion,
    setOpen,
    setQuery,
    status: searchStatus,
    suggestions,
  } = typeahead;

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
            if (!isSharedSelection) {
              setSelectedStock(restoredStocks[0]!);
              setStatus("loading");
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
    [isSharedSelection],
  );

  useEffect(
    function keepSelectionInUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set("symbol", selectedStock.symbol);
      url.searchParams.set("timeframe", timeframe);
      window.history.replaceState(window.history.state, "", url);
    },
    [selectedStock.symbol, timeframe],
  );

  useEffect(
    function loadSelectedStock() {
      let cancelled = false;
      const currentRequest = ++requestNumber.current;
      lastSeriesRequestAt.current = Date.now();
      loadStockSeries(selectedStock, timeframe)
        .then(function showSeries(nextSeries) {
          if (!cancelled && currentRequest === requestNumber.current) {
            setSeries(nextSeries);
            setStatus("idle");
          }
          return undefined;
        })
        .catch(function showSeriesError() {
          if (!cancelled && currentRequest === requestNumber.current) setStatus("error");
        });
      return function ignoreStaleSeries() {
        cancelled = true;
      };
    },
    [selectedStock, timeframe],
  );

  useEffect(
    function refreshSelectedStockOnRefocus() {
      let cancelled = false;

      function refreshIfStale() {
        if (document.visibilityState !== "visible") return;

        const now = Date.now();
        if (now - lastSeriesRequestAt.current < refocusRefreshIntervalMilliseconds) return;

        lastSeriesRequestAt.current = now;
        const currentRequest = ++requestNumber.current;
        loadStockSeries(selectedStock, timeframe)
          .then(function showRefreshedSeries(nextSeries) {
            if (!cancelled && currentRequest === requestNumber.current) {
              setSeries(nextSeries);
              setStatus("idle");
            }
            return undefined;
          })
          .catch(function keepExistingSeries() {
            return undefined;
          });
      }

      function refreshWhenVisible() {
        if (document.visibilityState === "visible") refreshIfStale();
      }

      window.addEventListener("focus", refreshIfStale);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      return function removeRefocusListeners() {
        cancelled = true;
        window.removeEventListener("focus", refreshIfStale);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    },
    [selectedStock, timeframe],
  );

  function persistWatchlist(nextWatchlist: StockIdentity[]) {
    setWatchlist(nextWatchlist);
    window.localStorage.setItem(storageKey, JSON.stringify(nextWatchlist));
  }

  function addStock(stock: StockIdentity) {
    const alreadyAdded = watchlist.some(function hasSymbol(item) {
      return item.symbol === stock.symbol;
    });
    if (!alreadyAdded) persistWatchlist([...watchlist, stock]);
    startTransition(function selectAddedStock() {
      setStatus("loading");
      setShareStatus("idle");
      setSelectedStock(stock);
    });
    playStockHaptic(alreadyAdded ? "select" : "success");
  }

  function removeStock(stock: StockIdentity) {
    const nextWatchlist = watchlist.filter(function keepOtherStock(item) {
      return item.symbol !== stock.symbol;
    });
    persistWatchlist(nextWatchlist);
    if (selectedStock.symbol === stock.symbol && nextWatchlist[0]) {
      setStatus("loading");
      setShareStatus("idle");
      setSelectedStock(nextWatchlist[0]);
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

  const latestPoint = series?.points.at(-1);
  const firstPoint = series?.points[0];
  const change = latestPoint && firstPoint ? latestPoint.close - firstPoint.close : 0;
  const changePercent = firstPoint ? (change / firstPoint.close) * 100 : 0;
  const priceFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: series?.identity.currency ?? selectedStock.currency,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-5" aria-label={labels.watchlist}>
        <div className="relative z-20">
          <label htmlFor="stock-search" className="sr-only">
            {labels.search}
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <Input
              id="stock-search"
              value={query}
              role="combobox"
              aria-autocomplete="list"
              aria-controls="stock-suggestions"
              aria-expanded={open}
              aria-activedescendant={
                activeSuggestionIndex >= 0 ? `stock-suggestion-${activeSuggestionIndex}` : undefined
              }
              tabIndex={0}
              autoComplete="off"
              placeholder={labels.searchPlaceholder}
              className="h-11 rounded-xl pr-9 pl-9"
              onChange={function updateQuery(event) {
                setQuery(event.currentTarget.value);
              }}
              onKeyDown={handleKeyDown}
              onFocus={function reopenSuggestions() {
                if (suggestions.length > 0) setOpen(true);
              }}
            />
            {searchStatus === "loading" ? (
              <span
                aria-hidden="true"
                className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground border-r-transparent motion-reduce:animate-none"
              />
            ) : query ? (
              <button
                type="button"
                aria-label={labels.close}
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={function clearSearch() {
                  clear();
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>
          {open ? (
            <Surface
              as="ul"
              id="stock-suggestions"
              role="listbox"
              className="absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-80 list-none overflow-y-auto p-1 shadow-raised"
            >
              {suggestions.map(function renderSuggestion(stock, index) {
                const isAdded = watchlist.some(function hasSymbol(item) {
                  return item.symbol === stock.symbol;
                });
                return (
                  <li key={`${stock.symbol}-${stock.exchange}`}>
                    <button
                      id={`stock-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeSuggestionIndex}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-accent"
                      onClick={function chooseSuggestion() {
                        selectSuggestion(stock);
                      }}
                    >
                      <span className="min-w-0">
                        <Text as="span" size="sm" weight="semibold">
                          {stock.symbol}
                        </Text>
                        <Text as="span" size="xs" tone="muted" numberOfLines={1} className="block">
                          {stock.name} · {stock.exchange}
                        </Text>
                      </span>
                      <Text as="span" size="xs" tone="muted">
                        {isAdded ? labels.added : labels.add}
                      </Text>
                    </button>
                  </li>
                );
              })}
            </Surface>
          ) : null}
          <Text size="xs" tone="muted" className="px-1 pt-2">
            {labels.searchHelp}
          </Text>
        </div>

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
                  <li key={stock.symbol} className="group relative min-w-36 lg:min-w-0">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className="flex w-full flex-col rounded-xl px-3 py-3 text-left transition-[background-color,transform] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transform-none"
                      onClick={function selectWatchlistStock() {
                        setStatus("loading");
                        setShareStatus("idle");
                        setSelectedStock(stock);
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
                          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                        }
                      >
                        {stock.name}
                      </Text>
                    </button>
                    <button
                      type="button"
                      aria-label={`${labels.remove} ${stock.symbol}`}
                      className="absolute top-1.5 right-1.5 hidden size-6 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:flex hover:bg-background hover:text-foreground focus-visible:flex focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={function removeWatchlistStock(event) {
                        event.stopPropagation();
                        removeStock(stock);
                      }}
                    >
                      <span aria-hidden="true">×</span>
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
                {series?.isDemo ? (
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
                    setStatus("loading");
                    setShareStatus("idle");
                    setTimeframe(option);
                    playStockHaptic("select");
                  }}
                >
                  {option}
                </Button>
              );
            })}
          </div>

          {!series && status === "loading" ? (
            <div
              className="flex min-h-[calc(4.5rem+0.75rem)] flex-col justify-end gap-3"
              role="status"
            >
              <div className="h-[4.5rem] animate-pulse rounded-xl bg-muted/60 motion-reduce:animate-none sm:h-12" />
              <div className="flex aspect-[2/1] items-center justify-center rounded-xl bg-muted/60 sm:aspect-[2.35/1]">
                <Text size="sm" tone="muted">
                  {labels.loading}
                </Text>
              </div>
            </div>
          ) : status === "error" || !series ? (
            <div
              className="flex min-h-[calc(4.5rem+0.75rem)] flex-col justify-end gap-3"
              role="alert"
            >
              <div className="h-[4.5rem] sm:h-12" />
              <div className="flex aspect-[2/1] items-center justify-center rounded-xl border border-dashed p-6 text-center sm:aspect-[2.35/1]">
                <Text size="sm" tone="muted">
                  {labels.dataUnavailable}
                </Text>
              </div>
            </div>
          ) : (
            <div className="relative" aria-busy={status === "loading"}>
              <StockChart
                key={`${selectedStock.symbol}-${series.timeframe}`}
                currency={series.identity.currency}
                labels={labels}
                locale={locale}
                points={series.points}
                symbol={selectedStock.symbol}
                timeframe={series.timeframe}
              />
              {status === "loading" ? (
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/55 backdrop-blur-[2px]"
                  role="status"
                >
                  <Text
                    size="sm"
                    tone="muted"
                    className="rounded-full bg-card px-3 py-1.5 shadow-sm"
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
