import type { Metadata } from "next";

import { JsonLd } from "../../../components/json-ld";
import { createWebApplicationStructuredData } from "../../../lib/seo";
import { loadPodcastMessages } from "../../../messages/podcasts/load-messages";
import { getRequestLocale } from "../../get-request-locale";
import { loadPopularPodcasts } from "./podcasts-data";
import { PodcastsHomeScreen } from "./podcasts-home-screen";
import { createPodcastsMetadata } from "./podcasts-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPodcastsMetadata({ locale: await getRequestLocale(), path: "/podcasts" });
}

export default async function PodcastsHomePage() {
  const locale = await getRequestLocale();
  const [messages, popular] = await Promise.all([
    loadPodcastMessages(locale),
    loadPopularPodcasts(),
  ]);
  const structuredData = createWebApplicationStructuredData({
    name: messages.Podcasts,
    description:
      messages[
        "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device."
      ],
    applicationCategory: "MultimediaApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [
      messages["Top Shows"],
      messages.Search,
      messages.Library,
      messages["Up Next"],
      messages["Sleep Timer"],
    ],
    locale,
    path: "/podcasts",
  });

  return (
    <>
      <JsonLd value={structuredData} />
      <PodcastsHomeScreen popular={popular} />
    </>
  );
}
