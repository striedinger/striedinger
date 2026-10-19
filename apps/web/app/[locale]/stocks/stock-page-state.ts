import type { StockTimeframe } from "./types";

import { singleSearchParam } from "../../../lib/search-params";
import { stockTimeframes } from "./types";

interface StockPageState {
  query: string;
  symbol: string | null;
  timeframe: StockTimeframe;
}

export function getStockPageState(
  searchParams: Record<string, string | string[] | undefined>,
): StockPageState {
  const requestedSymbol = singleSearchParam(searchParams.symbol)?.trim().toUpperCase();
  const requestedTimeframe = singleSearchParam(searchParams.timeframe)?.trim().toUpperCase();
  const query = singleSearchParam(searchParams.q)?.trim().replace(/\s+/g, " ").slice(0, 40) ?? "";
  return {
    query,
    symbol: requestedSymbol && /^[A-Z0-9.:-]{1,20}$/.test(requestedSymbol) ? requestedSymbol : null,
    timeframe: stockTimeframes.includes(requestedTimeframe as StockTimeframe)
      ? (requestedTimeframe as StockTimeframe)
      : "1M",
  };
}
