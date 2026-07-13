import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";

interface NumberPadProps {
  disabled: boolean;
  disabledValues: ReadonlySet<number>;
  eraseLabel: string;
  label: string;
  onSelect: (value: number) => void;
}

export function NumberPad({
  disabled,
  disabledValues,
  eraseLabel,
  label,
  onSelect,
}: NumberPadProps) {
  return (
    <div className="flex flex-col gap-3" aria-label={label}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(function renderNumber(value) {
          return (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="lg"
              disabled={disabled || disabledValues.has(value)}
              onClick={function selectNumber() {
                onSelect(value);
              }}
              className="h-12 min-w-0 px-0 text-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] sm:h-11"
            >
              <Text as="span" family="rounded" weight="semibold" className="tabular-nums">
                {value}
              </Text>
            </Button>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={disabled}
          onClick={function eraseValue() {
            onSelect(0);
          }}
          className="h-12 min-w-0 px-2 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] sm:h-11"
        >
          <Text as="span" size="sm" weight="medium">
            {eraseLabel}
          </Text>
        </Button>
      </div>
    </div>
  );
}
