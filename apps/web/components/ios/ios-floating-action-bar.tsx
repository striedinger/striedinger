import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { iosBottomScrollEdgeClassName } from "./ios-scroll-edge";

/**
 * The floating bar at the bottom of a tool screen for its primary actions, over a scroll-edge
 * fade. The bar lets touches through to the content; give its buttons `pointer-events-auto`.
 */
export function IosFloatingActionBar({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pt-8 pb-safe-min-3.5",
        iosBottomScrollEdgeClassName,
        className,
      )}
      {...props}
    />
  );
}
