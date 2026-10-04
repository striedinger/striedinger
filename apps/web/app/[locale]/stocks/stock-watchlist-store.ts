"use client";

import { useSyncExternalStore } from "react";

import type { StockIdentity } from "./types";

import { readStoredValue, writeStoredValue } from "../../../lib/browser-storage";
import { defaultStocks, spaceXStock } from "./stock-defaults";

const storageKey = "stocks-watchlist:v1";
const maximumStocks = 30;
const previousDefaultSymbols = new Set(["AAPL", "MSFT", "NVDA"]);

/** The stored string the cached watchlist was parsed from, so reads only parse after a change. */
let cachedStoredValue: string | null | undefined;
let cachedWatchlist: readonly StockIdentity[] = defaultStocks;

function parseWatchlist(storedValue: string | null): readonly StockIdentity[] {
  if (storedValue === null) return defaultStocks;
  try {
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!Array.isArray(parsedValue)) return defaultStocks;
    const validStocks = parsedValue.filter(isStockIdentity).slice(0, maximumStocks);
    if (validStocks.length === 0 && parsedValue.length > 0) return defaultStocks;
    return isPreviousDefaultWatchlist(validStocks) ? [...validStocks, spaceXStock] : validStocks;
  } catch {
    return defaultStocks;
  }
}

function getWatchlistSnapshot() {
  const storedValue = readStoredValue(storageKey);
  if (storedValue !== cachedStoredValue) {
    cachedStoredValue = storedValue;
    cachedWatchlist = parseWatchlist(storedValue);
  }
  return cachedWatchlist;
}

/** The server cannot see the browser's watchlist, so it renders placeholders instead. */
function getServerWatchlistSnapshot() {
  return null;
}

const listeners = new Set<() => void>();

function subscribeToWatchlist(listener: () => void) {
  listeners.add(listener);
  function synchronizeOtherTabs(event: StorageEvent) {
    if (event.key === null || event.key === storageKey) listener();
  }
  window.addEventListener("storage", synchronizeOtherTabs);
  return function unsubscribeFromWatchlist() {
    listeners.delete(listener);
    window.removeEventListener("storage", synchronizeOtherTabs);
  };
}

/**
 * The watchlist saved in this browser, or `null` while hydrating server HTML. It is read
 * during render rather than in an effect, so a client navigation shows it at once.
 */
export function useStockWatchlist() {
  return useSyncExternalStore(
    subscribeToWatchlist,
    getWatchlistSnapshot,
    getServerWatchlistSnapshot,
  );
}

export function saveStockWatchlist(watchlist: readonly StockIdentity[]) {
  writeStoredValue(storageKey, JSON.stringify(watchlist));
  // Read back what storage holds, so a failed write keeps the new list in memory.
  cachedStoredValue = readStoredValue(storageKey);
  cachedWatchlist = watchlist;
  for (const listener of listeners) listener();
}

function isStockIdentity(value: unknown): value is StockIdentity {
  if (!value || typeof value !== "object") return false;
  const stock = value as Partial<StockIdentity>;
  return (
    typeof stock.symbol === "string" &&
    /^[A-Z0-9.:-]{1,20}$/.test(stock.symbol) &&
    typeof stock.name === "string" &&
    typeof stock.exchange === "string" &&
    typeof stock.currency === "string" &&
    /^[A-Z]{3}$/.test(stock.currency)
  );
}

function isPreviousDefaultWatchlist(stocks: readonly StockIdentity[]) {
  return (
    stocks.length === previousDefaultSymbols.size &&
    stocks.every(function isPreviousDefault(stock) {
      return previousDefaultSymbols.has(stock.symbol);
    })
  );
}
