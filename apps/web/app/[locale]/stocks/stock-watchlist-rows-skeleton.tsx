import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { defaultStocks } from "./stock-defaults";

/** Watchlist rows in placeholder form until the browser's saved watchlist is read. */
export function StockWatchlistRowsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-px overflow-hidden rounded-ios-xl">
      {defaultStocks.map(function renderRow(stock) {
        return <IosSkeleton key={stock.symbol} className="h-14.5 rounded-none" />;
      })}
    </div>
  );
}
