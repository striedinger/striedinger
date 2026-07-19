"use server";

import { headers } from "next/headers";

import type { StockIdentity, StockTimeframe } from "./types";

import { isRateLimited } from "../../lib/rate-limit";
import { getStockSeries, searchStockSymbols } from "../../lib/stocks/market-data";
import { stockTimeframes } from "./types";

export async function searchStocks(query: string) {
  await enforceStocksRateLimit("search", 30);
  return searchStockSymbols(query);
}

export async function loadStockSeries(identity: StockIdentity, timeframe: StockTimeframe) {
  if (!stockTimeframes.includes(timeframe)) throw new Error("Invalid timeframe");
  await enforceStocksRateLimit("series", 30);
  return getStockSeries(identity, timeframe);
}

async function enforceStocksRateLimit(scope: string, maximumRequests: number) {
  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  if (
    await isRateLimited({
      identifier,
      maximumRequests,
      scope: `stocks-${scope}`,
      windowMilliseconds: 60_000,
    })
  ) {
    throw new Error("Rate limit exceeded");
  }
}
