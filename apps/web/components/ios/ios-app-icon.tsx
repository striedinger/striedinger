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
          ? "size-[60px] rounded-[14px] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.12)] [&_svg]:size-[30px] [&_svg]:stroke-[2.2]"
          : "size-[29px] rounded-[7px] [&_svg]:size-[17px] [&_svg]:stroke-[2.4]",
        backgroundClassName,
      )}
    >
      {children}
    </span>
  );
}
