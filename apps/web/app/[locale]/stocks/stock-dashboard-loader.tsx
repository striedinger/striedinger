import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type { StockIdentity, StocksLabels } from "./types";

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

/** Reads the requested stock from the URL, inside the page's Suspense boundary, so the rest
 * of the page prerenders. */
export async function StockDashboardLoader({
  labels,
  locale,
  searchParams,
}: StockDashboardLoaderProps) {
  const {
    query,
    symbol: initialSymbol,
    timeframe: initialTimeframe,
  } = getStockPageState(await searchParams);
  const stockPromise = initialSymbol
    ? resolveInitialStock(initialSymbol)
    : Promise.resolve(defaultStocks[0]!);
  const searchResultsPromise = query
    ? searchStockSymbols(query).catch(function useEmptySearchResults() {
        return [];
      })
    : Promise.resolve<StockIdentity[]>([]);
  const seriesPromise = stockPromise
    .then(function loadInitialSeries(initialStock) {
      return getStockSeries(initialStock, initialTimeframe);
    })
    .catch(function useUnavailableInitialSeries() {
      return null;
    });
  // Search suggestions stream separately, so the chart never waits on symbol search.
  const [initialStock, initialSeries] = await Promise.all([stockPromise, seriesPromise]);
  return (
    <StockDashboard
      initialSeries={initialSeries}
      initialStock={initialStock}
      initialTimeframe={initialTimeframe}
      labels={labels}
      locale={locale}
      searchQuery={query}
      searchResults={searchResultsPromise}
    />
  );
}

async function resolveInitialStock(symbol: string) {
  const featuredStock = featuredStocks.find(function matchesFeaturedSymbol(stock) {
    return stock.symbol === symbol;
  });
  if (featuredStock) return featuredStock;
  if (await isSharedLinkRateLimited()) return defaultStocks[0]!;
  const matches = await searchStockSymbols(symbol);
  return (
    matches.find(function matchesSharedSymbol(stock) {
      return stock.symbol === symbol;
    }) ?? defaultStocks[0]!
  );
}

async function isSharedLinkRateLimited() {
  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  return isRateLimited({
    identifier,
    maximumRequests: 20,
    scope: "stocks-shared-link",
    windowMilliseconds: 60_000,
  });
}
