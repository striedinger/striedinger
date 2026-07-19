import "server-only";
import { cache } from "react";

import type {
  StockIdentity,
  StockPoint,
  StockSeries,
  StockTimeframe,
} from "../../app/stocks/types";

import { featuredStocks } from "../../app/stocks/stock-defaults";
import { getLatestTradingDayPoints } from "./stock-series";

const twelveDataBaseUrl = "https://api.twelvedata.com";
const supportedSymbolPattern = /^[A-Z0-9.:-]{1,20}$/;

const timeframeRequests: Record<
  StockTimeframe,
  { interval: string; outputsize: number; demoPoints: number; freshnessSeconds: number }
> = {
  "1D": { interval: "5min", outputsize: 78, demoPoints: 78, freshnessSeconds: 30 },
  "1W": { interval: "30min", outputsize: 70, demoPoints: 70, freshnessSeconds: 60 },
  "1M": { interval: "2h", outputsize: 90, demoPoints: 90, freshnessSeconds: 300 },
  "3M": { interval: "1day", outputsize: 90, demoPoints: 90, freshnessSeconds: 900 },
  "1Y": { interval: "1day", outputsize: 260, demoPoints: 260, freshnessSeconds: 1_800 },
  "5Y": {
    interval: "1week",
    outputsize: 260,
    demoPoints: 260,
    freshnessSeconds: 21_600,
  },
  MAX: {
    interval: "1month",
    outputsize: 600,
    demoPoints: 360,
    freshnessSeconds: 86_400,
  },
};

interface TwelveDataSearchResponse {
  data?: Array<{
    currency?: string;
    exchange?: string;
    instrument_name?: string;
    symbol?: string;
  }>;
}

interface TwelveDataSeriesResponse {
  code?: number;
  message?: string;
  meta?: { currency?: string; exchange?: string; symbol?: string };
  values?: Array<{
    close?: string;
    datetime?: string;
    high?: string;
    low?: string;
    open?: string;
    volume?: string;
  }>;
}

const searchStockSymbolsCached = cache(loadStockSymbols);

export function searchStockSymbols(query: string): Promise<StockIdentity[]> {
  return searchStockSymbolsCached(query);
}

async function loadStockSymbols(query: string): Promise<StockIdentity[]> {
  const normalizedQuery = query.trim().toUpperCase().slice(0, 40);
  if (normalizedQuery.length < 1) return [];

  const localMatches = featuredStocks.filter(function matchesFeaturedStock(stock) {
    return (
      stock.symbol.includes(normalizedQuery) || stock.name.toUpperCase().includes(normalizedQuery)
    );
  });
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return localMatches.slice(0, 8);

  const url = new URL("/symbol_search", twelveDataBaseUrl);
  url.searchParams.set("symbol", normalizedQuery);
  url.searchParams.set("outputsize", "8");
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return localMatches.slice(0, 8);
    const payload = (await response.json()) as TwelveDataSearchResponse;
    const remoteMatches = (payload.data ?? []).flatMap(function parseSearchResult(item) {
      const symbol = item.symbol?.trim().toUpperCase();
      if (!symbol || !supportedSymbolPattern.test(symbol)) return [];
      return [
        {
          symbol,
          name: item.instrument_name?.trim() || symbol,
          exchange: item.exchange?.trim() || "Market",
          currency: item.currency?.trim() || "USD",
        },
      ];
    });
    return uniqueStocks([...localMatches, ...remoteMatches]).slice(0, 8);
  } catch {
    return localMatches.slice(0, 8);
  }
}

const getStockSeriesCached = cache(loadStockSeries);

export function getStockSeries(
  identity: StockIdentity,
  timeframe: StockTimeframe,
): Promise<StockSeries> {
  return getStockSeriesCached(identity, timeframe);
}

async function loadStockSeries(
  identity: StockIdentity,
  timeframe: StockTimeframe,
): Promise<StockSeries> {
  const normalizedIdentity = validateIdentity(identity);
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return createDemoSeries(normalizedIdentity, timeframe);

  const request = timeframeRequests[timeframe];
  const url = new URL("/time_series", twelveDataBaseUrl);
  url.searchParams.set("symbol", normalizedIdentity.symbol);
  url.searchParams.set("interval", request.interval);
  url.searchParams.set("outputsize", String(request.outputsize));
  url.searchParams.set("order", "asc");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    next: { revalidate: request.freshnessSeconds },
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) throw new Error("Market data request failed");
  const payload = (await response.json()) as TwelveDataSeriesResponse;
  const parsedPoints = (payload.values ?? []).flatMap(parsePoint);
  const points = timeframe === "1D" ? getLatestTradingDayPoints(parsedPoints) : parsedPoints;
  if (points.length < 1) throw new Error(payload.message ?? "Market data unavailable");

  return {
    identity: {
      ...normalizedIdentity,
      currency: payload.meta?.currency || normalizedIdentity.currency,
      exchange: payload.meta?.exchange || normalizedIdentity.exchange,
    },
    timeframe,
    points,
    isDemo: false,
  };
}

function parsePoint(value: NonNullable<TwelveDataSeriesResponse["values"]>[number]): StockPoint[] {
  const close = Number(value.close);
  const high = Number(value.high);
  const low = Number(value.low);
  const open = Number(value.open);
  const volume = Number(value.volume ?? 0);
  if (
    !value.datetime ||
    ![close, high, low, open, volume].every(function isFiniteValue(number) {
      return Number.isFinite(number);
    })
  ) {
    return [];
  }
  return [{ date: value.datetime, close, high, low, open, volume }];
}

function validateIdentity(identity: StockIdentity): StockIdentity {
  const symbol = identity.symbol.trim().toUpperCase();
  if (!supportedSymbolPattern.test(symbol)) throw new Error("Invalid stock symbol");
  return {
    symbol,
    name: identity.name.trim().slice(0, 100) || symbol,
    exchange: identity.exchange.trim().slice(0, 40) || "Market",
    currency: identity.currency.trim().slice(0, 10) || "USD",
  };
}

function uniqueStocks(stocks: StockIdentity[]) {
  const seen = new Set<string>();
  return stocks.filter(function keepFirstSymbol(stock) {
    if (seen.has(stock.symbol)) return false;
    seen.add(stock.symbol);
    return true;
  });
}

function createDemoSeries(identity: StockIdentity, timeframe: StockTimeframe): StockSeries {
  const { demoPoints } = timeframeRequests[timeframe];
  const seed = Array.from(identity.symbol).reduce(function hashSymbol(total, character) {
    return total + character.charCodeAt(0);
  }, 0);
  const basePrice = 70 + (seed % 210);
  const points = Array.from({ length: demoPoints }, function createPoint(_, index) {
    const trend = index * (0.03 + (seed % 7) / 100);
    const wave = Math.sin(index / 7 + seed) * 3.2 + Math.sin(index / 19) * 4.8;
    const close = basePrice + trend + wave;
    const open = close - Math.sin(index * 1.7) * 1.1;
    const high = Math.max(open, close) + 0.5 + Math.abs(Math.sin(index)) * 1.2;
    const low = Math.min(open, close) - 0.5 - Math.abs(Math.cos(index)) * 1.2;
    return {
      date: demoDate(timeframe, index, demoPoints),
      open,
      high,
      low,
      close,
      volume: Math.round(18_000_000 + Math.abs(Math.sin(index / 3)) * 42_000_000),
    };
  });
  return { identity, timeframe, points, isDemo: true };
}

function demoDate(timeframe: StockTimeframe, index: number, length: number) {
  const end = new Date();
  const steps: Record<StockTimeframe, number> = {
    "1D": 5 * 60_000,
    "1W": 30 * 60_000,
    "1M": 2 * 60 * 60_000,
    "3M": 24 * 60 * 60_000,
    "1Y": 24 * 60 * 60_000,
    "5Y": 7 * 24 * 60 * 60_000,
    MAX: 30 * 24 * 60 * 60_000,
  };
  return new Date(end.getTime() - (length - 1 - index) * steps[timeframe]).toISOString();
}
