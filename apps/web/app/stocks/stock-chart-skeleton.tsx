import { Skeleton } from "@workspace/ui/components/skeleton";

interface StockChartSkeletonProps {
  loadingLabel: string;
}

export function StockChartSkeleton({ loadingLabel }: StockChartSkeletonProps) {
  return (
    <div
      className="flex min-h-[calc(4.5rem+0.75rem)] flex-col gap-3"
      role="status"
      aria-label={loadingLabel}
    >
      <div className="grid h-[4.5rem] grid-cols-3 gap-3 sm:h-12 sm:grid-cols-4">
        {[
          { id: "open", width: "w-16" },
          { id: "high", width: "w-20" },
          { id: "low", width: "w-14" },
          { id: "volume", width: "w-16" },
        ].map(function renderMetric(metric, index) {
          return (
            <div key={metric.id} className={index === 3 ? "hidden sm:block" : undefined}>
              <Skeleton className="mb-2 h-3 w-12" />
              <Skeleton className={`h-5 ${metric.width}`} />
            </div>
          );
        })}
      </div>
      <div className="relative aspect-[1.5/1] overflow-hidden rounded-xl bg-muted/45 sm:aspect-[2.35/1]">
        <div className="absolute inset-x-4 top-4 flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="absolute right-[8%] bottom-[18%] left-[6%] h-1/3 rounded-[50%] opacity-70" />
      </div>
    </div>
  );
}
