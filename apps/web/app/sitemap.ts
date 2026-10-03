import type { MetadataRoute } from "next";

import { supportedLocales, type Locale } from "@workspace/i18n";

import type { SitePath } from "../lib/locale-path";

import { createLanguageAlternates, localizePath } from "../lib/locale-path";
import { siteUrl } from "../lib/seo";

const publicPaths = [
  "/",
  "/chat",
  "/drop",
  "/og",
  "/ip",
  "/javascript",
  "/image",
  "/pdf",
  "/json",
  "/sudoku",
  "/mta",
  "/stocks",
  "/podcasts",
  "/notes",
] as const satisfies readonly SitePath[];

function createSitemapEntry(path: SitePath, locale: Locale): MetadataRoute.Sitemap[number] {
  const localizedPath = localizePath(path, locale);
  const url = createAbsoluteUrl(localizedPath);
  const imageUrl = localizedPath === "/" ? `${siteUrl}/opengraph-image` : `${url}/opengraph-image`;
  const languages = Object.fromEntries(
    Object.entries(createLanguageAlternates(path)).map(function createAbsoluteAlternate([
      language,
      alternatePath,
    ]) {
      return [language, createAbsoluteUrl(alternatePath)];
    }),
  );

  return {
    url,
    images: [imageUrl],
    alternates: { languages },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap(function createLocalizedEntries(path) {
    return supportedLocales.map(function createLocaleEntry(locale) {
      return createSitemapEntry(path, locale);
    });
  });
}

function createAbsoluteUrl(path: SitePath) {
  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}
