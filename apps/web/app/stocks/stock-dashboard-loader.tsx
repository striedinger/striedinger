import type { Locale } from "@workspace/i18n";

import { headers } from "next/headers";

import type { StocksLabels, StockTimeframe } from "./types";

import { isRateLimited } from "../../lib/rate-limit";
import { searchStockSymbols } from "../../lib/stocks/market-data";
import { StockDashboard } from "./stock-dashboard";
import { defaultStocks, featuredStocks } from "./stock-defaults";

interface StockDashboardLoaderProps {
  initialSymbol: string | null;
  initialTimeframe: StockTimeframe;
  labels: StocksLabels;
  locale: Locale;
}

export async function StockDashboardLoader({
  initialSymbol,
  initialTimeframe,
  labels,
  locale,
}: StockDashboardLoaderProps) {
  const initialStock = initialSymbol ? await resolveInitialStock(initialSymbol) : defaultStocks[0]!;
  return (
    <StockDashboard
      initialStock={initialStock}
      initialTimeframe={initialTimeframe}
      isSharedSelection={initialSymbol !== null}
      labels={labels}
      locale={locale}
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
