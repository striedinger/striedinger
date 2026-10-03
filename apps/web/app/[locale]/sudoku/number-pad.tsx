import { DeleteLeftIcon } from "@workspace/icons/delete-left-icon";
import { Text } from "@workspace/ui/components/text";

interface NumberPadProps {
  disabled: boolean;
  disabledValues: ReadonlySet<number>;
  eraseLabel: string;
  label: string;
  onSelect: (value: number) => void;
}

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const keyClassName =
  "flex h-[clamp(2.75rem,6.5dvh,3.5rem)] min-w-0 touch-manipulation items-center justify-center rounded-[14px] bg-(--ios-grouped-cell) text-(--ios-tint) shadow-[0_1px_0_rgb(0_0_0/0.08)] outline-none select-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:scale-[0.94] active:bg-(--ios-grouped-cell-pressed) disabled:text-(--ios-tertiary-label) disabled:shadow-none motion-safe:transition-transform";

/** A keypad of large rounded keys, like the iOS number pad, laid out in two rows of five. */
export function NumberPad({
  disabled,
  disabledValues,
  eraseLabel,
  label,
  onSelect,
}: NumberPadProps) {
  return (
    <div role="group" aria-label={label} className="grid shrink-0 grid-cols-5 gap-2">
      {digits.map(function renderNumber(value) {
        return (
          <button
            key={value}
            type="button"
            disabled={disabled || disabledValues.has(value)}
            className={keyClassName}
            onClick={function selectNumber() {
              onSelect(value);
            }}
          >
            <Text
              as="span"
              family="rounded"
              className="text-[clamp(22px,3.4dvh,28px)] leading-none font-medium text-inherit tabular-nums"
            >
              {value}
            </Text>
          </button>
        );
      })}
      <button
        type="button"
        aria-label={eraseLabel}
        disabled={disabled}
        className={`${keyClassName} text-(--ios-label) [&_svg]:size-6`}
        onClick={function eraseValue() {
          onSelect(0);
        }}
      >
        <DeleteLeftIcon />
      </button>
    </div>
  );
}
