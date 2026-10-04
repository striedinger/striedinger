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
        "group-data-scrolled/bar:bg-ios-glass group-data-scrolled/bar:text-ios-label flex size-11 shrink-0 items-center justify-center gap-0.5 rounded-full bg-white/18 text-[15px] font-semibold text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.35),0_6px_20px_rgb(0_0_0/0.15)] backdrop-blur-[14px] backdrop-saturate-[1.8] transition-[background-color,color,transform] duration-200 outline-none group-data-scrolled/bar:shadow-[inset_0_0.5px_0_0.5px_var(--ios-glass-edge),0_6px_20px_var(--ios-glass-shadow)] focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90 motion-reduce:transition-none [&_svg]:size-[20px]",
        className,
      )}
      {...props}
    />
  );
}
