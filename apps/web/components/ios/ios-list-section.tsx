import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

type IosListSectionHeaderVariant = "default" | "prominent";

interface IosListSectionProps {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  header?: ReactNode;
  headerVariant?: IosListSectionHeaderVariant;
  label?: string;
  /** Adjusts the inset grouped card, such as plain sidebar rows on wide screens. */
  listClassName?: string;
}

export function IosListSection({
  children,
  className,
  footer,
  header,
  headerVariant = "default",
  label,
  listClassName,
}: IosListSectionProps) {
  return (
    <section aria-label={label} className={cn("flex flex-col px-4", className)}>
      {header ? (
        <Text
          as="h2"
          className={cn(
            headerVariant === "prominent"
              ? "pt-3 pb-2 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
              : "px-5 pt-4 pb-1.5 text-[15px] leading-5 font-semibold tracking-[-0.23px] text-(--ios-secondary-label)",
          )}
        >
          {header}
        </Text>
      ) : null}
      <ul
        className={cn(
          "m-0 list-none overflow-hidden rounded-[22px] bg-(--ios-grouped-cell) p-0",
          listClassName,
        )}
      >
        {children}
      </ul>
      {footer ? (
        <Text className="px-5 pt-2 text-[13px] leading-[18px] tracking-[-0.08px] text-(--ios-secondary-label)">
          {footer}
        </Text>
      ) : null}
    </section>
  );
}
