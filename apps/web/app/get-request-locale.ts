import { isLocale, localeCookieName, resolveLocale, type Locale } from "@workspace/i18n";
import { cookies, headers } from "next/headers";
import { cache } from "react";

const getCachedRequestLocale = cache(resolveRequestLocale);

export function getRequestLocale(): Promise<Locale> {
  return getCachedRequestLocale();
}

async function resolveRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookieName)?.value;

  if (savedLocale && isLocale(savedLocale)) {
    return savedLocale;
  }

  const requestHeaders = await headers();
  const acceptedLanguages = requestHeaders
    .get("accept-language")
    ?.split(",")
    .map(function removeLanguageWeight(languageRange) {
      return languageRange.trim().split(";")[0];
    })
    .filter(function hasLanguageTag(languageTag): languageTag is string {
      return Boolean(languageTag);
    });

  return resolveLocale(acceptedLanguages ?? []);
}
