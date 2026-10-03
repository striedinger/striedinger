import { isLocale, type Locale } from "@workspace/i18n";
import { locale as readLocaleParam } from "next/root-params";

/**
 * The locale of the page being rendered, from the `[locale]` root segment. Unprefixed URLs
 * reach it through the proxy, which maps them to the visitor's language, so pages stay static
 * per locale instead of reading request headers.
 */
export async function getRequestLocale(): Promise<Locale> {
  const locale = await readLocaleParam();
  return locale && isLocale(locale) ? locale : "en";
}

/** The locale of a route handler under `[locale]`, such as an Open Graph image. */
export async function getRouteLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : "en";
}
