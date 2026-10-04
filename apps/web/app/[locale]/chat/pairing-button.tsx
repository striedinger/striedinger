import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";

type PairingButtonVariant = "filled" | "tinted" | "plain";

type PairingButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: PairingButtonVariant;
};

const variantClassNames: Readonly<Record<PairingButtonVariant, string>> = {
  filled: `${iosFilledButtonClassName} w-full disabled:bg-ios-fill disabled:text-ios-tertiary-label disabled:opacity-100 disabled:shadow-none`,
  tinted:
    "h-12.5 bg-ios-tint/15 font-semibold text-ios-tint disabled:bg-ios-fill disabled:text-ios-tertiary-label",
  plain: "h-11 text-ios-tint active:opacity-50 disabled:text-ios-tertiary-label",
};

/** A full-width iOS capsule button for the pairing steps, filled for the primary action. */
export function PairingButton({
  className,
  type = "button",
  variant = "filled",
  ...props
}: PairingButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        variant !== "filled" &&
          "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 text-ios-body transition-[transform,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:scale-[0.98] disabled:active:scale-100 motion-reduce:transition-none [&_svg]:size-5 [&_svg]:shrink-0",
        variantClassNames[variant],
        className,
      )}
      {...props}
    />
  );
}
