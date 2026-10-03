import { cn } from "@workspace/ui/lib/utils";

interface IosSkeletonProps {
  className?: string;
}

/** A shimmering placeholder block in the iOS fill color. */
export function IosSkeleton({ className }: IosSkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-shimmer rounded-lg bg-(--ios-tertiary-fill) bg-[linear-gradient(100deg,transparent_20%,color-mix(in_oklab,var(--ios-label)_6%,transparent)_50%,transparent_80%)] bg-[length:200%_100%] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
