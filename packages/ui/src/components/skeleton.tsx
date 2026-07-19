import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type SkeletonProps = ComponentPropsWithRef<"div">;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-muted/70 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
