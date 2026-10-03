import type { MetadataRoute } from "next";

import { supportedLocales, type Locale } from "@workspace/i18n";

import type { SitePath } from "../lib/locale-path";

import { createLanguageAlternates, localizePath } from "../lib/locale-path";
import { getPopularPodcasts } from "../lib/podcasts/apple-podcasts";
import { siteUrl } from "../lib/seo";
import { getShowHref } from "./[locale]/podcasts/podcast-route";

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

function createSitemapEntry(
  path: SitePath,
  locale: Locale,
  image?: string,
): MetadataRoute.Sitemap[number] {
  const localizedPath = localizePath(path, locale);
  const url = createAbsoluteUrl(localizedPath);
  const imageUrl =
    image ?? (localizedPath === "/" ? `${siteUrl}/opengraph-image` : `${url}/opengraph-image`);
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Top shows have their own pages, which are worth indexing like the tools themselves.
  const popularPodcasts = await getPopularPodcasts();
  const pages = [
    ...publicPaths.map(function createPage(path) {
      return { path, image: undefined };
    }),
    ...popularPodcasts.map(function createShowPage(podcast) {
      return { path: getShowHref(podcast), image: podcast.artworkUrl };
    }),
  ];
  return pages.flatMap(function createLocalizedEntries({ path, image }) {
    return supportedLocales.map(function createLocaleEntry(locale) {
      return createSitemapEntry(path, locale, image);
    });
  });
}

function createAbsoluteUrl(path: SitePath) {
  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}
