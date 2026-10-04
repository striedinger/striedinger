import { StockDashboardSkeleton } from "./stock-dashboard-skeleton";

export default function StocksLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex size-full max-w-6xl flex-col bg-ios-grouped-background pt-safe-plus-26"
    >
      <StockDashboardSkeleton />
    </div>
  );
}
