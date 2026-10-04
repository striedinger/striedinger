"use client";

import { isLocale, localeCookieName, supportedLocales, type Locale } from "@workspace/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";

import { localizePath, stripLocaleFromPath } from "../lib/locale-path";
import { localeNames } from "./locale-names";
import { useOpenAfterMount } from "./use-open-after-mount";

interface LanguageSelectProps {
  /** Moves focus to the trigger once mounted, when it replaces a focused placeholder. */
  focusOnMount: boolean;
  label: string;
  locale: Locale;
  /** Opens the list once mounted, when a press on the placeholder loaded it. */
  openOnMount: boolean;
}

const localeItems = supportedLocales.map(function createLocaleItem(locale) {
  return { label: localeNames[locale], value: locale };
});

/**
 * The full language select, loaded the first time someone reaches for the picker so the
 * select and positioning code stay out of the initial page load.
 */
export function LanguageSelect({ focusOnMount, label, locale, openOnMount }: LanguageSelectProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shouldOpenOnMount = useOpenAfterMount(openOnMount);
  const [openState, setOpenState] = useState<boolean | null>(null);

  useEffect(
    function focusReplacedPlaceholder() {
      if (focusOnMount) triggerRef.current?.focus();
    },
    [focusOnMount],
  );
  // Shows the chosen language right away while the translated page loads.
  const [displayedLocale, setDisplayedLocale] = useOptimistic(locale);

  function handleLanguageChange(selectedLocale: Locale | null) {
    if (selectedLocale === null || !isLocale(selectedLocale)) {
      return;
    }

    const oneYearInSeconds = 60 * 60 * 24 * 365;

    document.cookie = `${localeCookieName}=${selectedLocale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
    document.documentElement.lang = selectedLocale;

    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = localizePath(stripLocaleFromPath(currentUrl.pathname), selectedLocale);
    startTransition(function showSelectedLanguage() {
      setDisplayedLocale(selectedLocale);
      router.push(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    });
  }

  return (
    <Select
      items={localeItems}
      value={displayedLocale}
      open={openState ?? shouldOpenOnMount}
      onOpenChange={setOpenState}
      onValueChange={handleLanguageChange}
    >
      <SelectTrigger
        ref={triggerRef}
        className="w-32 cursor-pointer rounded-xl px-3"
        size="sm"
        aria-label={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
        alignItemWithTrigger={false}
        align="start"
        sideOffset={6}
      >
        {supportedLocales.map(function renderLocaleOption(supportedLocale) {
          return (
            <SelectItem
              className="rounded-lg focus:bg-accent/80"
              key={supportedLocale}
              value={supportedLocale}
            >
              {localeNames[supportedLocale]}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
