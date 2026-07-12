import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type PageContainerSize = "narrow" | "content" | "wide";

const sizeClasses: Readonly<Record<PageContainerSize, string>> = {
  narrow: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-6xl",
};

type PageContainerProps = ComponentPropsWithRef<"div"> & {
  size?: PageContainerSize;
};

function PageContainer({ className, size = "wide", ...props }: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn("mx-auto flex w-full flex-col gap-12", sizeClasses[size], className)}
      {...props}
    />
  );
}

export { PageContainer };
export type { PageContainerProps, PageContainerSize };
