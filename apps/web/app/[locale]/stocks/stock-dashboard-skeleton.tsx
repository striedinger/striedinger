import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const watchlistRows = [0, 1, 2, 3];
const stats = [0, 1, 2, 3];

/** The watchlist and chart in placeholder form while market data loads. */
export function StockDashboardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-5 px-4 pb-4 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6"
    >
      <IosSkeleton className="h-11 rounded-full lg:col-span-2" />
      <div className="flex flex-col gap-4 rounded-ios-xl bg-ios-grouped-cell p-4 sm:p-5 lg:order-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <IosSkeleton className="h-8 w-24" />
            <IosSkeleton className="h-4 w-44" />
          </div>
          <IosSkeleton className="size-11 rounded-full" />
        </div>
        <IosSkeleton className="h-10 w-56" />
        <IosSkeleton className="h-9 rounded-ios-md" />
        <IosSkeleton className="aspect-1.5/1 w-full rounded-ios-lg sm:aspect-[2.35/1]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(function renderStat(stat) {
            return <IosSkeleton key={stat} className="h-15.5 rounded-ios-md" />;
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2 lg:order-1">
        <IosSkeleton className="mx-4 h-7 w-32" />
        <div className="flex flex-col gap-px overflow-hidden rounded-ios-xl">
          {watchlistRows.map(function renderRow(row) {
            return <IosSkeleton key={row} className="h-14.5 rounded-none" />;
          })}
        </div>
      </div>
    </div>
  );
}
