import { isLocale, localeCookieName, resolveLocale, type Locale } from "@workspace/i18n";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { routeLocaleHeaderName } from "../lib/locale-path";

const getCachedRequestLocale = cache(resolveRequestLocale);

export function getRequestLocale(): Promise<Locale> {
  return getCachedRequestLocale();
}

/**
 * The locale named in the URL, or English for unprefixed URLs. Responses that are cached and
 * shared across visitors, such as Open Graph images, use this instead of the visitor's
 * cookie or browser language.
 */
export async function getRouteLocale(): Promise<Locale> {
  const routeLocale = (await headers()).get(routeLocaleHeaderName);
  return routeLocale && isLocale(routeLocale) ? routeLocale : "en";
}

async function resolveRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const routeLocale = requestHeaders.get(routeLocaleHeaderName);

  if (routeLocale && isLocale(routeLocale)) {
    return routeLocale;
  }

  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookieName)?.value;

  if (savedLocale && isLocale(savedLocale)) {
    return savedLocale;
  }

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
