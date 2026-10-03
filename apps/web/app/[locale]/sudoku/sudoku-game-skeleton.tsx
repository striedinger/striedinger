import { Skeleton } from "@workspace/ui/components/skeleton";

export function SudokuGameSkeleton() {
  return (
    <div className="flex flex-col gap-5 sm:gap-8" aria-hidden="true">
      <section className="flex flex-col gap-2 sm:gap-3">
        <div className="flex min-h-8 items-center">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </section>
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-7 w-12" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[20rem] flex-col gap-4 sm:max-w-[36rem] sm:gap-5">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }, function renderNumber(_, index) {
            return <Skeleton key={index} className="aspect-square rounded-lg" />;
          })}
        </div>
      </div>
    </div>
  );
}
