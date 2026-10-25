import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { defaultStocks } from "./stock-defaults";

/** Watchlist rows in placeholder form until the browser's saved watchlist is read. */
export function StockWatchlistRowsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {defaultStocks.map(function renderRow(stock) {
        return (
          <div key={stock.symbol} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
            <div className="flex flex-1 flex-col gap-1.5">
              <IosSkeleton className="h-4.5 w-14" />
              <IosSkeleton className="h-4 w-28" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <IosSkeleton className="h-4.5 w-14" />
              <IosSkeleton className="h-7 w-18 rounded-ios-sm" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
