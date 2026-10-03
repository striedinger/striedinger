import type { Locale } from "@workspace/i18n";
import type { Metadata } from "next";

import { localizePath, type SitePath } from "../../../lib/locale-path";
import { createPageMetadata } from "../../../lib/seo";
import { getPodcastTranslator } from "../../../messages/podcasts/get-translator";

interface PodcastsMetadataOptions {
  description?: string;
  /** Screens that only make sense inside the app, such as search results, stay out of indexes. */
  indexable?: boolean;
  locale: Locale;
  path: SitePath;
  /** The screen's own title, shown before the app name. */
  title?: string;
}

/** Metadata for a Podcasts screen, sharing the app's social card. */
export async function createPodcastsMetadata({
  description,
  indexable = true,
  locale,
  path,
  title,
}: PodcastsMetadataOptions): Promise<Metadata> {
  const translate = await getPodcastTranslator(locale);
  const appName = translate("Podcasts");
  const metadata = createPageMetadata({
    title: title ? `${title} · ${appName}` : appName,
    description:
      description ??
      translate(
        "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device.",
      ),
    imagePath: `${localizePath("/podcasts", locale)}/opengraph-image`,
    locale,
    path,
  });
  return indexable ? metadata : { ...metadata, robots: { index: false, follow: true } };
}
