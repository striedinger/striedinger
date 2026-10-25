import type { StockTimeframe } from "./types";

import { singleSearchParam } from "../../../lib/search-params";
import { stockTimeframes } from "./types";

interface StockPageState {
  /** The browser's watchlist symbols, which the page mirrors into the URL; `null` when absent. */
  list: string[] | null;
  query: string;
  symbol: string | null;
  timeframe: StockTimeframe;
}

const stockSymbolPattern = /^[A-Z0-9.:-]{1,20}$/;
export const maximumWatchlistSymbols = 30;
/** Stocks opens a symbol on its trading day, as the iOS app does. */
export const defaultStockTimeframe: StockTimeframe = "1D";

export function getStockPageState(
  searchParams: Record<string, string | string[] | undefined>,
): StockPageState {
  const requestedSymbol = singleSearchParam(searchParams.symbol)?.trim().toUpperCase();
  const requestedTimeframe = singleSearchParam(searchParams.timeframe)?.trim().toUpperCase();
  const requestedList = singleSearchParam(searchParams.list);
  const query = singleSearchParam(searchParams.q)?.trim().replace(/\s+/g, " ").slice(0, 40) ?? "";
  return {
    list: requestedList === undefined ? null : parseSymbolList(requestedList),
    query,
    symbol: requestedSymbol && stockSymbolPattern.test(requestedSymbol) ? requestedSymbol : null,
    timeframe: stockTimeframes.includes(requestedTimeframe as StockTimeframe)
      ? (requestedTimeframe as StockTimeframe)
      : defaultStockTimeframe,
  };
}

function parseSymbolList(list: string) {
  const symbols = list
    .split(",")
    .map(function normalizeSymbol(symbol) {
      return symbol.trim().toUpperCase();
    })
    .filter(function isValidSymbol(symbol) {
      return stockSymbolPattern.test(symbol);
    });
  return [...new Set(symbols)].slice(0, maximumWatchlistSymbols);
}
