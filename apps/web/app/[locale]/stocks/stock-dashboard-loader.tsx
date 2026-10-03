import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type { StockIdentity, StocksLabels, StockTimeframe } from "./types";

import { isRateLimited } from "../../../lib/rate-limit";
import { getStockSeries, searchStockSymbols } from "../../../lib/stocks/market-data";
import { StockDashboard } from "./stock-dashboard";
import { defaultStocks, featuredStocks } from "./stock-defaults";

interface StockDashboardLoaderProps {
  initialSymbol: string | null;
  initialTimeframe: StockTimeframe;
  labels: StocksLabels;
  locale: Locale;
  query: string;
}

export async function StockDashboardLoader({
  initialSymbol,
  initialTimeframe,
  labels,
  locale,
  query,
}: StockDashboardLoaderProps) {
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
      isSharedSelection={initialSymbol !== null}
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
