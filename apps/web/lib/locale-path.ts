import { isLocale, supportedLocales, type Locale } from "@workspace/i18n";

export const routeLocaleHeaderName = "x-route-locale";

export type SitePath = `/${string}` | "/";

export function localizePath(path: SitePath, locale: Locale): SitePath {
  if (locale === "en") {
    return path;
  }

  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function getPathLocale(pathname: string): Locale | null {
  const firstSegment = pathname.split("/")[1];

  return firstSegment && isLocale(firstSegment) ? firstSegment : null;
}

export function stripLocaleFromPath(pathname: string): SitePath {
  const locale = getPathLocale(pathname);

  if (!locale) {
    return normalizePath(pathname);
  }

  return normalizePath(pathname.slice(locale.length + 1));
}

export function createLanguageAlternates(path: SitePath): Record<string, SitePath> {
  return Object.fromEntries([
    ["x-default", path],
    ...supportedLocales.map(function createLocaleAlternate(locale) {
      return [locale, localizePath(path, locale)];
    }),
  ]);
}

function normalizePath(pathname: string): SitePath {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return (pathname.startsWith("/") ? pathname : `/${pathname}`) as SitePath;
}
