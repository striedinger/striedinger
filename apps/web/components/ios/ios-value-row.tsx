import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

export type IosValueStatus = "positive" | "negative" | "warning";

interface IosValueRowProps {
  label: string;
  monospaceLabel?: boolean;
  monospaceValue?: boolean;
  status?: IosValueStatus;
  value: string;
}

const statusClassNames: Readonly<Record<IosValueStatus, string>> = {
  negative: "bg-ios-red",
  positive: "bg-ios-green",
  warning: "bg-ios-orange",
};

// Beyond this many characters a value moves beneath its label, as long entries do in
// Settings > General > About, so it can wrap without squeezing the label.
const inlineCharacterLimit = 32;

/** A read-only label and value row in an inset grouped list. */
export function IosValueRow({
  label,
  monospaceLabel = false,
  monospaceValue = false,
  status,
  value,
}: IosValueRowProps) {
  const isStacked = value.includes("\n") || label.length + value.length > inlineCharacterLimit;

  return (
    <li
      className={cn(
        "not-last:after:bg-ios-separator relative flex min-h-[44px] px-4 py-[11px] not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50",
        isStacked ? "flex-col gap-0.5" : "items-center justify-between gap-4",
      )}
    >
      <Text
        as="span"
        family={monospaceLabel ? "mono" : undefined}
        className={cn(
          "text-ios-label min-w-0 [overflow-wrap:anywhere]",
          monospaceLabel ? "text-[15px] leading-[22px]" : "text-ios-body",
        )}
      >
        {label}
      </Text>
      <Text
        as="span"
        family={monospaceValue ? "mono" : undefined}
        className={cn(
          "text-ios-secondary-label min-w-0 [overflow-wrap:anywhere] tabular-nums",
          isStacked ? "text-ios-subheadline whitespace-pre-wrap" : "text-ios-body text-right",
        )}
      >
        {status ? (
          <span
            aria-hidden="true"
            className={cn(
              "mr-2 inline-block size-2 rounded-full align-[0.1em]",
              statusClassNames[status],
            )}
          />
        ) : null}
        {value}
      </Text>
    </li>
  );
}
