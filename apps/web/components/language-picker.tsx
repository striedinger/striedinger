"use client";

import type { FocusEvent } from "react";

import { type Locale } from "@workspace/i18n";
import { ChevronDownIcon } from "@workspace/icons/chevron-down-icon";
import { lazy, Suspense, useState } from "react";

import { localeNames } from "./locale-names";

interface LanguagePickerProps {
  label: string;
  locale: Locale;
}

interface Activation {
  focus: boolean;
  open: boolean;
}

function importLanguageSelect() {
  return import("./language-select");
}

const LanguageSelect = lazy(function loadLanguageSelect() {
  return importLanguageSelect().then(function selectComponent(module) {
    return { default: module.LanguageSelect };
  });
});

/**
 * Shows the current language in a button that looks like the select trigger, and swaps in
 * the real select the first time it is pressed or reached by keyboard. Hovering or touching
 * starts the download early.
 */
export function LanguagePicker({ label, locale }: LanguagePickerProps) {
  const [activation, setActivation] = useState<Activation | null>(null);

  function preloadSelect() {
    void importLanguageSelect();
  }

  const placeholder = (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      className="flex h-8 w-32 cursor-pointer items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none hover:-translate-y-px hover:border-primary/25 hover:bg-accent/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 motion-reduce:transform-none motion-reduce:transition-none"
      onPointerEnter={preloadSelect}
      onTouchStart={preloadSelect}
      onFocus={function activateFromKeyboard(event: FocusEvent<HTMLButtonElement>) {
        preloadSelect();
        if (event.currentTarget.matches(":focus-visible")) {
          setActivation({ focus: true, open: false });
        }
      }}
      onClick={function activateAndOpen() {
        setActivation({ focus: true, open: true });
      }}
    >
      <span className="line-clamp-1">{localeNames[locale]}</span>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none size-4 shrink-0 opacity-50"
      />
    </button>
  );

  // The page wraps the picker in its text styles, so the client bundle carries no Text
  // component or class merging.
  return activation ? (
    <Suspense fallback={placeholder}>
      <LanguageSelect
        focusOnMount={activation.focus}
        label={label}
        locale={locale}
        openOnMount={activation.open}
      />
    </Suspense>
  ) : (
    placeholder
  );
}
