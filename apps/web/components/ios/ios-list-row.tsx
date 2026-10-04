import type { ReactNode } from "react";

import { ChevronRightIcon } from "@workspace/icons/chevron-right-icon";
import { cn } from "@workspace/ui/lib/utils";

import { IosLink } from "./ios-link";

interface IosListRowProps {
  className?: string;
  detail?: ReactNode;
  /** Pushes this screen when the row is tapped; rows without one are buttons. */
  href?: string;
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}

export function IosListRow({
  className,
  detail,
  href,
  icon,
  label,
  onClick,
  selected = false,
}: IosListRowProps) {
  const rowClassName = cn(
    "flex min-h-13 w-full items-center gap-3 py-3 pr-4 pl-4 text-left text-ios-body text-ios-label transition-colors duration-150 outline-none select-none hover:bg-ios-fill/40 focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed aria-current:bg-ios-tint aria-current:text-white motion-reduce:transition-none dark:aria-current:text-black",
    className,
  );
  const content = (
    <>
      {icon ? (
        <span className="flex size-6 shrink-0 items-center justify-center text-ios-tint in-aria-current:text-white [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {detail !== undefined ? (
        <span className="shrink-0 text-ios-secondary-label tabular-nums in-aria-current:text-white/80">
          {detail}
        </span>
      ) : null}
      <ChevronRightIcon
        className="size-3.75 shrink-0 text-ios-tertiary-label in-aria-current:text-white/70"
        strokeWidth={3}
      />
    </>
  );

  return (
    <li
      className={cn(
        "relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator",
        icon ? "not-last:after:left-13" : "not-last:after:left-4",
      )}
    >
      {href ? (
        <IosLink
          href={href}
          aria-current={selected ? "page" : undefined}
          className={rowClassName}
          onClick={onClick}
        >
          {content}
        </IosLink>
      ) : (
        <button
          type="button"
          aria-current={selected || undefined}
          className={rowClassName}
          onClick={onClick}
        >
          {content}
        </button>
      )}
    </li>
  );
}
