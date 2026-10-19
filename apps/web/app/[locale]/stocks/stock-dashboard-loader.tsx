import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type { StockIdentity, StockSeries, StocksLabels, StockTimeframe } from "./types";

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
  const searchResultsPromise = query
    ? searchStockSymbols(query).catch(function useEmptySearchResults() {
        return [];
      })
    : Promise.resolve<StockIdentity[]>([]);
  // Search suggestions stream separately, so the chart never waits on symbol search.
  const [initialStock, initialSeries] = await loadInitialStock(
    initialSymbol ?? defaultStocks[0]!.symbol,
    initialTimeframe,
  );
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

/** The stock in the URL and its series, with the series requested as early as it is safe to. */
async function loadInitialStock(
  symbol: string,
  timeframe: StockTimeframe,
): Promise<[StockIdentity, StockSeries | null]> {
  const featuredStock = featuredStocks.find(function matchesFeaturedSymbol(stock) {
    return stock.symbol === symbol;
  });
  if (featuredStock) return [featuredStock, await loadSeries(featuredStock, timeframe)];
  const fallbackStock = defaultStocks[0]!;
  // A shared link can name any symbol, so looking one up is rate limited per visitor.
  if (await isSharedLinkRateLimited()) {
    return [fallbackStock, await loadSeries(fallbackStock, timeframe)];
  }
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
  if (!match) return [fallbackStock, await loadSeries(fallbackStock, timeframe)];
  return [match, series && { ...series, identity: { ...series.identity, name: match.name } }];
}

function loadSeries(stock: StockIdentity, timeframe: StockTimeframe) {
  return getStockSeries(stock, timeframe).catch(function useUnavailableSeries() {
    return null;
  });
}

async function isSharedLinkRateLimited() {
  // Navigating inside the app (timeframes, search, refreshing on return) sends an RSC request.
  // Only opening a link counts, so ordinary use never trips the limit and swaps the stock.
  if ((await headers()).get("rsc") === "1") return false;
  return isRateLimited({
    identifier: await getClientIdentifier(),
    maximumRequests: 20,
    scope: "stocks-shared-link",
    windowMilliseconds: 60_000,
  });
}
