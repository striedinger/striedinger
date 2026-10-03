import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type IosBarButtonProps = ComponentPropsWithRef<"button">;

export function IosBarButton({ className, type = "button", ...props }: IosBarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-[17px] leading-[22px] tracking-[-0.43px] whitespace-nowrap text-(--ios-tint) transition-opacity duration-100 outline-none select-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/60 active:opacity-40 disabled:text-(--ios-tertiary-label) motion-reduce:transition-none [&_svg]:size-[22px] [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
