import type { StockTimeframe } from "./types";

import { defaultStockTimeframe } from "./stock-page-state";

/** Everything the Stocks page keeps in its URL, which the server reads to stream its data. */
export interface StocksUrlState {
  /** Comma-separated watchlist symbols, or `null` for the default watchlist. */
  list: string | null;
  query: string;
  symbol: string | null;
  timeframe: StockTimeframe;
}

export function createStocksHref(pathname: string, state: StocksUrlState) {
  const parameters = new URLSearchParams();
  if (state.list !== null) parameters.set("list", state.list);
  if (state.symbol) parameters.set("symbol", state.symbol);
  if (state.timeframe !== defaultStockTimeframe) parameters.set("timeframe", state.timeframe);
  if (state.query) parameters.set("q", state.query);
  // Symbols never need escaping, so the list stays readable as `AAPL,MSFT`.
  const search = parameters.toString().replaceAll("%2C", ",");
  return search ? `${pathname}?${search}` : pathname;
}
