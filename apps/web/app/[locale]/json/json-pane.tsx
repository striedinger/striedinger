import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";

interface JsonPaneProps {
  /** A control aligned with the section header, such as a tinted text button. */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  heading: string;
  headingId: string;
}

/** An inset grouped section with a header, one card, and an optional footnote. */
export function JsonPane({ action, children, footer, heading, headingId }: JsonPaneProps) {
  return (
    <section className="flex min-w-0 flex-col" aria-labelledby={headingId}>
      <div className="flex min-h-9 items-end justify-between gap-3 px-5 pb-1.5">
        <Text
          as="h2"
          id={headingId}
          className="text-ios-subheadline text-ios-secondary-label font-semibold"
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
