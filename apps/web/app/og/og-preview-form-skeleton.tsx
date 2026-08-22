import { Skeleton } from "@workspace/ui/components/skeleton";

export function OgPreviewFormSkeleton() {
  return (
    <div className="flex flex-col gap-16" aria-busy="true" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="aspect-[1.91/1] w-full rounded-xl" />
      </div>
    </div>
  );
}
