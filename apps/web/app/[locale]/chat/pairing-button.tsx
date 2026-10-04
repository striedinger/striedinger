import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

type PairingButtonVariant = "filled" | "tinted" | "plain";

type PairingButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: PairingButtonVariant;
};

const variantClassNames: Readonly<Record<PairingButtonVariant, string>> = {
  filled:
    "h-[50px] bg-(--ios-tint) font-semibold text-white disabled:bg-(--ios-fill) disabled:text-(--ios-tertiary-label)",
  tinted:
    "h-[50px] bg-(--ios-tint)/15 font-semibold text-(--ios-tint) disabled:bg-(--ios-fill) disabled:text-(--ios-tertiary-label)",
  plain: "h-11 text-(--ios-tint) active:opacity-50 disabled:text-(--ios-tertiary-label)",
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
        "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 text-[17px] leading-[22px] tracking-[-0.43px] transition-[transform,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:scale-[0.98] disabled:active:scale-100 motion-reduce:transition-none [&_svg]:size-5 [&_svg]:shrink-0",
        variantClassNames[variant],
        className,
      )}
      {...props}
    />
  );
}
