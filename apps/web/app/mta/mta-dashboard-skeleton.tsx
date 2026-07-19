import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

export function MtaDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden="true">
      <Surface className="flex min-h-40 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-44" />
        </div>
        <Skeleton className="h-4 w-full max-w-lg" />
      </Surface>
      <section className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 9 }, function renderTrainFilter(_, index) {
            return <Skeleton key={index} className="size-10 shrink-0 rounded-full" />;
          })}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, function renderStation(_station, index) {
            return (
              <Surface key={index} className="flex min-h-72 flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                {Array.from({ length: 3 }, function renderArrival(_arrival, arrivalIndex) {
                  return (
                    <div key={arrivalIndex} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="flex flex-col gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-12" />
                    </div>
                  );
                })}
              </Surface>
            );
          })}
        </div>
      </section>
    </div>
  );
}
