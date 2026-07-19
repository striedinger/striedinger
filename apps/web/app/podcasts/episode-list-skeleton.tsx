import { Skeleton } from "@workspace/ui/components/skeleton";

interface EpisodeListSkeletonProps {
  label: string;
}

export function EpisodeListSkeleton({ label }: EpisodeListSkeletonProps) {
  return (
    <div className="flex flex-col divide-y divide-border/70" role="status" aria-label={label}>
      {Array.from({ length: 5 }, function renderEpisode(_, index) {
        return (
          <div
            key={index}
            className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <Skeleton className={index % 2 === 0 ? "h-5 w-4/5" : "h-5 w-2/3"} />
              <Skeleton className="mt-2 h-3 w-32" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className={index % 2 === 0 ? "h-4 w-5/6" : "h-4 w-3/4"} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
