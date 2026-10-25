import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type {
  StockDetail,
  StockIdentity,
  StockQuote,
  StockSeries,
  StocksLabels,
  StockTimeframe,
} from "./types";

import { getClientIdentifier } from "../../../lib/client-identifier";
import { isRateLimited } from "../../../lib/rate-limit";
import { getStockSeries, searchStockSymbols } from "../../../lib/stocks/market-data";
import { StockDashboard } from "./stock-dashboard";
import { defaultStocks, featuredStocks } from "./stock-defaults";
import { getStockPageState } from "./stock-page-state";

interface StockDashboardLoaderProps {
  labels: StocksLabels;
  locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Quoting is capped so a long watchlist cannot fan out into dozens of upstream requests. */
const maximumQuotedSymbols = 20;
const sparklinePointCount = 40;

/**
 * Reads the watchlist, open stock, and search from the URL, inside the page's Suspense
 * boundary, so the rest of the page prerenders. Quotes, the open stock, and suggestions each
 * stream on their own, so the list never waits on a chart or a search.
 */
export async function StockDashboardLoader({
  labels,
  locale,
  searchParams,
}: StockDashboardLoaderProps) {
  const { list, query, symbol, timeframe } = getStockPageState(await searchParams);
  // Opening a link counts against a per-visitor limit for symbols outside the built-in set.
  const checkRateLimit = createSharedLinkRateLimitCheck();
  const quotedSymbols = (list ?? defaultStocks.map(getSymbol)).slice(0, maximumQuotedSymbols);
  const quotesPromise = loadQuotes(quotedSymbols, checkRateLimit);
  const detailPromise = symbol
    ? loadDetail(symbol, timeframe, checkRateLimit)
    : Promise.resolve<StockDetail | null>(null);
  const searchResultsPromise = query
    ? searchStockSymbols(query).catch(function useEmptySearchResults() {
        return [];
      })
    : Promise.resolve<StockIdentity[]>([]);
  return (
    <StockDashboard
      detail={detailPromise}
      labels={labels}
      listParameter={list?.join(",") ?? null}
      locale={locale}
      quotes={quotesPromise}
      searchQuery={query}
      searchResults={searchResultsPromise}
      selectedSymbol={symbol}
      timeframe={timeframe}
    />
  );
}

async function loadQuotes(
  symbols: readonly string[],
  checkRateLimit: () => Promise<boolean>,
): Promise<Record<string, StockQuote>> {
  const isLimited = symbols.every(isFeaturedSymbol) ? false : await checkRateLimit();
  const quotes = await Promise.all(
    symbols.map(function loadQuote(symbol) {
      if (isLimited && !isFeaturedSymbol(symbol)) return Promise.resolve(null);
      return loadSeries({ currency: "", exchange: "", name: symbol, symbol }, "1D").then(
        function summarizeSeries(series) {
          return series ? createQuote(series) : null;
        },
      );
    }),
  );
  return Object.fromEntries(
    quotes.flatMap(function keepQuote(quote) {
      return quote ? [[quote.symbol, quote]] : [];
    }),
  );
}

function createQuote(series: StockSeries): StockQuote | null {
  const firstPoint = series.points[0];
  const lastPoint = series.points.at(-1);
  if (!firstPoint || !lastPoint) return null;
  const change = lastPoint.close - firstPoint.open;
  return {
    change,
    changePercent: firstPoint.open === 0 ? 0 : (change / firstPoint.open) * 100,
    currency: series.identity.currency,
    price: lastPoint.close,
    sparkline: thinCloses(series, sparklinePointCount),
    symbol: series.identity.symbol,
  };
}

/** Every nth close, always ending on the latest, rounded so the payload stays small. */
function thinCloses(series: StockSeries, count: number) {
  const { points } = series;
  const step = Math.max(1, (points.length - 1) / (count - 1));
  const closes: number[] = [];
  for (let position = 0; position < points.length - 1; position += step) {
    closes.push(points[Math.round(position)]!.close);
  }
  closes.push(points.at(-1)!.close);
  return closes.map(function roundClose(close) {
    return Math.round(close * 100) / 100;
  });
}

/** The stock in the URL and its series, with the series requested as early as it is safe to. */
async function loadDetail(
  symbol: string,
  timeframe: StockTimeframe,
  checkRateLimit: () => Promise<boolean>,
): Promise<StockDetail | null> {
  const featuredStock = featuredStocks.find(function matchesFeaturedSymbol(stock) {
    return stock.symbol === symbol;
  });
  if (featuredStock) {
    return { stock: featuredStock, series: await loadSeries(featuredStock, timeframe) };
  }
  if (await checkRateLimit()) return null;
  // The name lookup and the series run side by side; the series only needs the symbol.
  const [matches, series] = await Promise.all([
    searchStockSymbols(symbol).catch(function useNoMatches() {
      return [];
    }),
    loadSeries({ currency: "", exchange: "", name: symbol, symbol }, timeframe),
  ]);
  const match = matches.find(function matchesSharedSymbol(stock) {
    return stock.symbol === symbol;
  });
  if (!match) return null;
  return {
    stock: match,
    series: series && { ...series, identity: { ...series.identity, name: match.name } },
  };
}

function loadSeries(stock: StockIdentity, timeframe: StockTimeframe) {
  return getStockSeries(stock, timeframe).catch(function useUnavailableSeries() {
    return null;
  });
}

function getSymbol(stock: StockIdentity) {
  return stock.symbol;
}

function isFeaturedSymbol(symbol: string) {
  return featuredStocks.some(function matchesFeaturedSymbol(stock) {
    return stock.symbol === symbol;
  });
}

/** Checks the limit at most once per request, and only when a symbol outside the set needs it. */
function createSharedLinkRateLimitCheck() {
  let check: Promise<boolean> | undefined;
  return function checkSharedLinkRateLimit() {
    check ??= isSharedLinkRateLimited();
    return check;
  };
}

async function isSharedLinkRateLimited() {
  // Navigating inside the app (opening a stock, searching, syncing the watchlist) sends an RSC
  // request. Only opening a link counts, so ordinary use never trips the limit.
  if ((await headers()).get("rsc") === "1") return false;
  return isRateLimited({
    identifier: await getClientIdentifier(),
    maximumRequests: 20,
    scope: "stocks-shared-link",
    windowMilliseconds: 60_000,
  });
}
