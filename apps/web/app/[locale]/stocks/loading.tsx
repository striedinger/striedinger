import { StockDashboardSkeleton } from "./stock-dashboard-skeleton";

export default function StocksLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex size-full max-w-6xl flex-col bg-ios-grouped-background pt-[calc(6.5rem+env(safe-area-inset-top))]"
    >
      <StockDashboardSkeleton />
    </div>
  );
}
