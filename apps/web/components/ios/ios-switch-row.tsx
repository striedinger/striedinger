"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

interface IosSwitchRowProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

/** An inset grouped list row with the iOS switch, the whole row toggling it. */
export function IosSwitchRow({
  checked,
  disabled = false,
  label,
  onCheckedChange,
}: IosSwitchRowProps) {
  return (
    <li className="relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 px-4 py-1.5 text-left outline-none select-none focus-visible:bg-ios-fill disabled:cursor-default disabled:opacity-50"
        onClick={function toggle() {
          onCheckedChange(!checked);
        }}
      >
        <Text as="span" className="text-ios-body text-ios-label">
          {label}
        </Text>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-7.75 w-12.75 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
            checked ? "bg-ios-green" : "bg-ios-fill",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-6.75 rounded-full bg-white shadow-ios-raised transition-transform duration-200 ease-ios motion-reduce:transition-none",
              checked && "translate-x-5",
            )}
          />
        </span>
      </button>
    </li>
  );
}
