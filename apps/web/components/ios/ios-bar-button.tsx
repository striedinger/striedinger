import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { isValidElement } from "react";

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
  children,
  className,
  type = "button",
  variant = "glass",
  ...props
}: IosBarButtonProps) {
  // A lone symbol sits in a circle; text, with or without a symbol, gets capsule padding.
  const isSymbolOnly = isValidElement(children);

  return (
    <button
      type={type}
      className={cn(
        "text-ios-body text-ios-label focus-visible:ring-ios-tint/60 disabled:text-ios-tertiary-label inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-[transform,opacity] duration-150 outline-none select-none hover:brightness-[0.97] focus-visible:ring-2 active:scale-[0.92] motion-reduce:transition-none dark:hover:brightness-110 [&_svg]:size-[21px] [&_svg]:shrink-0",
        isSymbolOnly ? "w-11 px-0" : "px-4",
        variant === "glass" && iosGlassClassName,
        variant === "prominent" &&
          "bg-ios-tint text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.35),0_6px_20px_var(--ios-glass-shadow)] dark:text-black",
        variant === "plain" && "text-ios-tint active:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
