import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

export function StockDashboardSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]" aria-hidden="true">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Surface className="flex min-h-64 flex-col gap-1 p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
          {Array.from({ length: 4 }, function renderWatchlistItem(_, index) {
            return (
              <div key={index} className="flex min-h-16 flex-col gap-2 rounded-xl px-3 py-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            );
          })}
        </Surface>
      </div>
      <Surface className="flex min-h-[34rem] flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {Array.from({ length: 7 }, function renderTimeframe(_, index) {
            return <Skeleton key={index} className="h-9 min-w-11 flex-1 rounded-lg" />;
          })}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex h-[4.5rem] flex-col gap-2 sm:h-12 sm:flex-row sm:justify-between">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-5 w-52" />
          </div>
          <Skeleton className="aspect-[1.5/1] w-full rounded-xl sm:aspect-[2.35/1]" />
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-5 sm:grid-cols-4">
          {Array.from({ length: 4 }, function renderMetric(_, index) {
            return (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-20" />
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
