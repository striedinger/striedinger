"use client";

import type { CSSProperties } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Text } from "@workspace/ui/components/text";
import { useSyncExternalStore } from "react";
import { preload } from "react-dom";

import type { Theme, ThemeId } from "../lib/themes";

import { getTheme, sortedThemes } from "../lib/themes";
import {
  getThemeSnapshot,
  getThemeStylesheetHref,
  setTheme,
  subscribeToTheme,
} from "./theme-store";

interface ThemePickerProps {
  label: string;
}

const themeItems = sortedThemes.map(function createThemeItem(theme) {
  return { label: theme.title, value: theme.id };
});

function getDefaultTheme(): ThemeId {
  return "default";
}

/** Starts downloading a preset while it is highlighted, so choosing it applies at once. */
function preloadThemeStylesheet(themeId: ThemeId) {
  const href = getThemeStylesheetHref(themeId);
  if (href) preload(href, { as: "style" });
}

function handleThemeChange(themeId: ThemeId | null) {
  if (themeId === null) return;
  setTheme(getTheme(themeId).id);
}

export function ThemePicker({ label }: ThemePickerProps) {
  const selectedTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getDefaultTheme);

  return (
    <Text as="div" size="sm">
      <Select items={themeItems} value={selectedTheme} onValueChange={handleThemeChange}>
        <SelectTrigger
          className="w-full cursor-pointer rounded-xl px-3"
          size="sm"
          aria-label={label}
        >
          <ThemeSwatch theme={getTheme(selectedTheme)} />
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="w-[var(--anchor-width)] min-w-56"
          alignItemWithTrigger={false}
          align="start"
          sideOffset={6}
        >
          {sortedThemes.map(function renderThemeOption(themeOption) {
            return (
              <SelectItem
                className="rounded-lg"
                key={themeOption.id}
                value={themeOption.id}
                onPointerEnter={function warmTheme() {
                  preloadThemeStylesheet(themeOption.id);
                }}
                onFocus={function warmFocusedTheme() {
                  preloadThemeStylesheet(themeOption.id);
                }}
              >
                <ThemeSwatch theme={themeOption} />
                {themeOption.title}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </Text>
  );
}

function ThemeSwatch({ theme }: { theme: Theme }) {
  const style = {
    "--theme-primary-dark": theme.primaryDark,
    "--theme-primary-light": theme.primaryLight,
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border border-foreground/15 bg-[var(--theme-primary-light)] shadow-xs dark:bg-[var(--theme-primary-dark)]"
      style={style}
    />
  );
}
