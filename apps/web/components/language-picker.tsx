"use client";

import {
  isLocale,
  localeCookieName,
  supportedLocales,
  type Locale,
} from "@workspace/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";

interface LanguagePickerProps {
  label: string;
  locale: Locale;
}

const localeNames: Readonly<Record<Locale, string>> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  fr: "Français",
  pt: "Português",
  zh: "中文",
  ja: "日本語",
};

const localeItems = supportedLocales.map(function createLocaleItem(locale) {
  return { label: localeNames[locale], value: locale };
});

export function LanguagePicker({ label, locale }: LanguagePickerProps) {
  const router = useRouter();

  function handleLanguageChange(selectedLocale: Locale | null) {
    if (selectedLocale === null || !isLocale(selectedLocale)) {
      return;
    }

    const oneYearInSeconds = 60 * 60 * 24 * 365;

    document.cookie = `${localeCookieName}=${selectedLocale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
    document.documentElement.lang = selectedLocale;
    router.refresh();
  }

  return (
    <Text as="div" size="sm" className="flex justify-center">
      <Select
        items={localeItems}
        value={locale}
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger
          className="w-32 cursor-pointer rounded-xl border-border/60 bg-background/90 px-3 shadow-sm hover:bg-accent/60 focus-visible:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/30"
          size="sm"
          aria-label={label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="w-[var(--anchor-width)] min-w-[var(--anchor-width)] rounded-xl border-border/60 shadow-lg"
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
    </Text>
  );
}
