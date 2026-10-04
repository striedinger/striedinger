import type { Locale } from "@workspace/i18n";

/** Each language's name in that language, as language pickers show them. */
export const localeNames: Readonly<Record<Locale, string>> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  fr: "Français",
  pt: "Português",
  zh: "中文",
  ja: "日本語",
};
