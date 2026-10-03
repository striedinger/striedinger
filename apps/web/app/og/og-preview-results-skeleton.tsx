import { Skeleton } from "@workspace/ui/components/skeleton";

export function OgPreviewResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-hidden="true">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="aspect-[1.91/1] w-full rounded-xl" />
    </div>
  );
}
