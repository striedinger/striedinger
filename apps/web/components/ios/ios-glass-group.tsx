import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { iosGlassClassName } from "./ios-glass";

interface IosGlassGroupProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

/**
 * Several bar buttons sharing one glass capsule, as iOS 26 groups related toolbar items.
 * Children should use the `plain` bar button variant so only the capsule carries glass.
 */
export function IosGlassGroup({ children, className, label }: IosGlassGroupProps) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={cn(
        "flex h-11 shrink-0 items-center rounded-full px-0.5",
        iosGlassClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}
