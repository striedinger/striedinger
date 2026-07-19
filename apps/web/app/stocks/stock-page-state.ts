import type { StockTimeframe } from "./types";

import { stockTimeframes } from "./types";

interface StockPageState {
  query: string;
  symbol: string | null;
  timeframe: StockTimeframe;
}

export function getStockPageState(
  searchParams: Record<string, string | string[] | undefined>,
): StockPageState {
  const requestedSymbol = singleValue(searchParams.symbol)?.trim().toUpperCase();
  const requestedTimeframe = singleValue(searchParams.timeframe)?.trim().toUpperCase();
  const query = singleValue(searchParams.q)?.trim().replace(/\s+/g, " ").slice(0, 40) ?? "";
  return {
    query,
    symbol: requestedSymbol && /^[A-Z0-9.:-]{1,20}$/.test(requestedSymbol) ? requestedSymbol : null,
    timeframe: stockTimeframes.includes(requestedTimeframe as StockTimeframe)
      ? (requestedTimeframe as StockTimeframe)
      : "1M",
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
