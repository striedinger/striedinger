import { Skeleton } from "@workspace/ui/components/skeleton";

interface PageHeaderSkeletonProps {
  compact?: boolean;
  eyebrow?: boolean;
}

export function PageHeaderSkeleton({ compact = false, eyebrow = false }: PageHeaderSkeletonProps) {
  return (
    <header className="flex max-w-3xl flex-col gap-4" aria-hidden="true">
      {eyebrow ? <Skeleton className="h-10 w-40 rounded-full" /> : null}
      <Skeleton className="h-11 w-[min(100%,24rem)] sm:h-14 sm:w-[30rem]" />
      <div
        className={
          compact ? "hidden max-w-2xl flex-col gap-2 sm:flex" : "flex max-w-2xl flex-col gap-2"
        }
      >
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-[min(82%,32rem)]" />
      </div>
    </header>
  );
}
