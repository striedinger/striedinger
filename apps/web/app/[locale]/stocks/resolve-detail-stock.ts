import type { StockDetail, StockIdentity } from "./types";

/**
 * The open stock as the server identified it, which names a symbol opened from a shared link,
 * or the stock the page already knew while that is loading.
 */
export function resolveDetailStock(
  detail: StockDetail | null | undefined,
  knownStock: StockIdentity,
): StockIdentity {
  return detail?.stock.symbol === knownStock.symbol ? detail.stock : knownStock;
}
