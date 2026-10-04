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
              ? "text-ios-title2 text-ios-label pt-3 pb-2 font-bold"
              : "text-ios-subheadline text-ios-secondary-label px-5 pt-4 pb-1.5 font-semibold",
          )}
        >
          {header}
        </Text>
      ) : null}
      <ul
        className={cn(
          "bg-ios-grouped-cell m-0 list-none overflow-hidden rounded-[22px] p-0",
          listClassName,
        )}
      >
        {children}
      </ul>
      {footer ? (
        <Text className="text-ios-footnote text-ios-secondary-label px-5 pt-2">{footer}</Text>
      ) : null}
    </section>
  );
}
