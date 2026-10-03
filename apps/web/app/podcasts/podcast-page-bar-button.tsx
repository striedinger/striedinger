import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type PodcastPageBarButtonProps = ComponentPropsWithRef<"button">;

/**
 * Round translucent buttons that sit on top of artwork-tinted headers, turning into plain tinted
 * glyphs once the navigation bar gains its material background.
 */
export function PodcastPageBarButton({
  className,
  type = "button",
  ...props
}: PodcastPageBarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex h-[30px] min-w-[30px] shrink-0 items-center justify-center gap-0.5 rounded-full bg-black/25 px-1.5 text-[15px] font-semibold text-white backdrop-blur-md transition-[background-color,color] duration-200 outline-none group-data-scrolled/bar:bg-(--ios-tertiary-fill) group-data-scrolled/bar:text-(--ios-tint) focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-60 motion-reduce:transition-none [&_svg]:size-[18px]",
        className,
      )}
      {...props}
    />
  );
}
