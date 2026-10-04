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
        "flex size-11 shrink-0 items-center justify-center gap-0.5 rounded-full bg-white/18 text-ios-subheadline font-semibold text-white shadow-ios-button backdrop-blur-[14px] backdrop-saturate-[1.8] transition-[background-color,color,transform] duration-200 outline-none group-data-scrolled/bar:bg-ios-glass group-data-scrolled/bar:text-ios-label group-data-scrolled/bar:shadow-[inset_0_0.5px_0_0.5px_var(--ios-glass-edge),0_6px_20px_var(--ios-glass-shadow)] focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90 motion-reduce:transition-none [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}
