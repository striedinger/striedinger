import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

interface IosAppIconProps {
  /** A background utility, usually a top-to-bottom gradient like the real app icon. */
  backgroundClassName: string;
  children: ReactNode;
  size: "home" | "settings";
}

/**
 * A glyph on a rounded square in the proportions of iOS icons: the 60-point home screen icon
 * or the 29-point icon beside a Settings row.
 */
export function IosAppIcon({ backgroundClassName, children, size }: IosAppIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center text-white",
        size === "home"
          ? "size-15 rounded-ios-lg shadow-ios-icon [&_svg]:size-7.5 [&_svg]:stroke-[2.2]"
          : "size-7.25 rounded-ios-sm [&_svg]:size-4.25 [&_svg]:stroke-[2.4]",
        backgroundClassName,
      )}
    >
      {children}
    </span>
  );
}
