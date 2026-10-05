import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";

interface IosGroupedPaneProps {
  /** A control aligned with the section header, such as a tinted text button. */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  heading: string;
  headingId: string;
}

/** An inset grouped section with a header, one card, and an optional footnote. */
export function IosGroupedPane({
  action,
  children,
  footer,
  heading,
  headingId,
}: IosGroupedPaneProps) {
  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={headingId}>
      <div className="flex min-h-9 items-end justify-between gap-3 px-5 pb-1.5">
        <Text
          as="h2"
          id={headingId}
          className="text-ios-subheadline font-semibold text-ios-secondary-label"
        >
          {heading}
        </Text>
        {action}
      </div>
      {children}
      {footer ? <div className="flex flex-col gap-1 px-5 pt-2">{footer}</div> : null}
    </section>
  );
}
