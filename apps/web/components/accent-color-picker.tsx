"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useSyncExternalStore } from "react";

import type { AccentColorId } from "../lib/accent-colors";

import { accentColors } from "../lib/accent-colors";
import {
  getAccentColorSnapshot,
  setAccentColor,
  subscribeToAccentColor,
} from "./accent-color-store";

interface AccentColorPickerProps {
  accentColor: AccentColorId;
  label: string;
}

export function AccentColorPicker({ accentColor, label }: AccentColorPickerProps) {
  const selectedAccentColor = useSyncExternalStore(
    subscribeToAccentColor,
    getAccentColorSnapshot,
    function getServerAccentColor() {
      return accentColor;
    },
  );

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {accentColors.map(function renderAccentColor(option, optionIndex) {
        const isSelected = selectedAccentColor === option.id;

        return (
          <Button
            key={option.id}
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`${label} ${optionIndex + 1}`}
            aria-pressed={isSelected}
            className={cn(
              "rounded-full p-0 hover:translate-y-0 hover:scale-105",
              isSelected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined,
            )}
            onClick={function selectAccentColor() {
              setAccentColor(option.id);
            }}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full border border-black/15 shadow-[inset_0_1px_1px_oklch(1_0_0/35%)] dark:border-white/20",
                option.id === "neutral" ? "bg-black dark:bg-white" : undefined,
              )}
              style={
                option.id === "neutral"
                  ? undefined
                  : { backgroundColor: `oklch(0.64 ${option.chroma} ${option.hue})` }
              }
            />
          </Button>
        );
      })}
    </div>
  );
}
