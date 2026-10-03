import type { ComponentPropsWithRef, ReactNode } from "react";

import { ChevronRightIcon } from "@workspace/icons/chevron-right-icon";
import { cn } from "@workspace/ui/lib/utils";

type IosListRowProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  detail?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
  selected?: boolean;
};

export function IosListRow({
  className,
  detail,
  icon,
  label,
  selected = false,
  type = "button",
  ...props
}: IosListRowProps) {
  return (
    <li
      className={cn(
        "relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-(--ios-separator)",
        icon ? "not-last:after:left-[52px]" : "not-last:after:left-4",
      )}
    >
      <button
        type={type}
        aria-current={selected || undefined}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 py-[11px] pr-4 pl-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-label) outline-none select-none focus-visible:bg-(--ios-fill) active:bg-(--ios-grouped-cell-pressed) aria-current:bg-(--ios-tint) aria-current:text-white",
          className,
        )}
        {...props}
      >
        {icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center text-(--ios-tint) in-aria-current:text-white [&_svg]:size-6">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {detail !== undefined ? (
          <span className="shrink-0 text-(--ios-secondary-label) tabular-nums in-aria-current:text-white/80">
            {detail}
          </span>
        ) : null}
        <ChevronRightIcon
          className="size-[15px] shrink-0 text-(--ios-tertiary-label) in-aria-current:text-white/70"
          strokeWidth={3}
        />
      </button>
    </li>
  );
}
