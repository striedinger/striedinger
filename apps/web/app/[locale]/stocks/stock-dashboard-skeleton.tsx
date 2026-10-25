import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { StockWatchlistRowsSkeleton } from "./stock-watchlist-rows-skeleton";

/** The search field and watchlist in placeholder form while the page reads its URL. */
export function StockDashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <IosSkeleton className="mx-4 h-11 rounded-full" />
      <StockWatchlistRowsSkeleton />
    </div>
  );
}
