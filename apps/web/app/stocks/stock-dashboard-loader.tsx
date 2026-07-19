import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type { StocksLabels, StockTimeframe } from "./types";

import { isRateLimited } from "../../lib/rate-limit";
import { getStockSeries, searchStockSymbols } from "../../lib/stocks/market-data";
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
    : Promise.resolve([]);
  const [initialStock, searchResults] = await Promise.all([stockPromise, searchResultsPromise]);
  const initialSeries = await getStockSeries(initialStock, initialTimeframe).catch(
    function useUnavailableInitialSeries() {
      return null;
    },
  );
  return (
    <StockDashboard
      initialSeries={initialSeries}
      initialStock={initialStock}
      initialTimeframe={initialTimeframe}
      isSharedSelection={initialSymbol !== null}
      key={`${initialStock.symbol}:${initialTimeframe}:${query}`}
      labels={labels}
      locale={locale}
      searchQuery={query}
      searchResults={searchResults}
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
