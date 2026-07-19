import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

export function PodcastsExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <Surface className="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-lg sm:w-28" />
        </div>
      </Surface>
      <div className="flex h-11 gap-1 overflow-hidden border-b border-border">
        <Skeleton className="h-11 w-24 shrink-0 rounded-none" />
        <Skeleton className="h-11 w-28 shrink-0 rounded-none" />
        <Skeleton className="h-11 w-28 shrink-0 rounded-none" />
      </div>
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-5 w-8" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, function renderPodcastCard(_, index) {
            return (
              <Surface key={index} className="flex min-w-0 flex-col overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="flex min-h-28 flex-col gap-2 p-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-auto h-4 w-1/2" />
                </div>
                <div className="border-t border-border/70 p-2">
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </Surface>
            );
          })}
        </div>
      </section>
    </div>
  );
}
