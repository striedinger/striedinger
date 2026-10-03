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
}

export function IosListSection({
  children,
  className,
  footer,
  header,
  headerVariant = "default",
  label,
}: IosListSectionProps) {
  return (
    <section aria-label={label} className={cn("flex flex-col px-4", className)}>
      {header ? (
        <Text
          as="h2"
          className={cn(
            headerVariant === "prominent"
              ? "px-1 pt-2 pb-2 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
              : "px-4 pt-4 pb-1.5 text-[13px] leading-[18px] tracking-[-0.08px] text-(--ios-secondary-label) uppercase",
          )}
        >
          {header}
        </Text>
      ) : null}
      <ul className="m-0 list-none overflow-hidden rounded-[10px] bg-(--ios-grouped-cell) p-0">
        {children}
      </ul>
      {footer ? (
        <Text className="px-4 pt-1.5 text-[13px] leading-[18px] tracking-[-0.08px] text-(--ios-secondary-label)">
          {footer}
        </Text>
      ) : null}
    </section>
  );
}
