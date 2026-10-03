import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { iosGlassClassName } from "./ios-glass";

type IosBarButtonVariant = "glass" | "prominent" | "plain";

type IosBarButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: IosBarButtonVariant;
};

/**
 * The iOS 26 bar button: a 44-point glass circle for symbols that stretches into a capsule
 * for text. The prominent variant fills with the app tint, like Done and compose actions.
 */
export function IosBarButton({
  className,
  type = "button",
  variant = "glass",
  ...props
}: IosBarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-[17px] leading-[22px] font-medium tracking-[-0.43px] whitespace-nowrap text-(--ios-label) transition-[transform,opacity] duration-150 outline-none select-none hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-(--ios-tint)/60 active:scale-[0.92] disabled:text-(--ios-tertiary-label) has-[svg:only-child]:px-0 motion-reduce:transition-none dark:hover:brightness-110 [&_svg]:size-[21px] [&_svg]:shrink-0",
        variant === "glass" && iosGlassClassName,
        variant === "prominent" &&
          "bg-(--ios-tint) text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.35),0_6px_20px_var(--ios-glass-shadow)] dark:text-black",
        variant === "plain" && "text-(--ios-tint) active:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
