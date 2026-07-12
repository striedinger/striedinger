import type { ComponentPropsWithRef, ElementType } from "react";

import { cn } from "@workspace/ui/lib/utils";

type SurfaceOwnProps<Element extends ElementType> = {
  as?: Element;
};

type SurfaceProps<Element extends ElementType = "div"> = SurfaceOwnProps<Element> &
  Omit<ComponentPropsWithRef<Element>, keyof SurfaceOwnProps<Element>>;

function Surface<Element extends ElementType = "div">({
  as,
  className,
  ...props
}: SurfaceProps<Element>) {
  const Component = as ?? "div";

  return (
    <Component
      data-slot="surface"
      className={cn("rounded-2xl border border-border/70 bg-card shadow-sm", className)}
      {...props}
    />
  );
}

export { Surface };
export type { SurfaceProps };
