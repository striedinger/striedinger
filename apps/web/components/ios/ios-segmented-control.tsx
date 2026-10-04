"use client";

import { cn } from "@workspace/ui/lib/utils";

interface IosSegmentedControlOption<Value extends string> {
  label: string;
  value: Value;
}

interface IosSegmentedControlProps<Value extends string> {
  className?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: Value) => void;
  options: readonly IosSegmentedControlOption<Value>[];
  value: Value;
}

/**
 * The iOS segmented control: a recessed track whose raised thumb slides to the selected
 * segment. Each segment is a toggle button, so assistive technology reads which is pressed.
 */
export function IosSegmentedControl<Value extends string>({
  className,
  disabled = false,
  label,
  onChange,
  options,
  value,
}: IosSegmentedControlProps<Value>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex(function isSelected(option) {
      return option.value === value;
    }),
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "relative grid h-9 auto-cols-fr grid-flow-col rounded-ios-md bg-ios-tertiary-fill p-0.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-ios-sm bg-ios-grouped-cell shadow-ios-raised transition-transform duration-300 ease-ios motion-reduce:transition-none dark:bg-ios-gray2-dark"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {options.map(function renderSegment(option) {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            className={cn(
              "relative z-10 min-w-0 truncate rounded-ios-sm px-2 text-ios-footnote text-ios-label outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/60 disabled:cursor-default",
              isSelected ? "font-semibold" : "font-medium",
              disabled && !isSelected && "text-ios-tertiary-label",
            )}
            onClick={function selectSegment() {
              if (!isSelected) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
