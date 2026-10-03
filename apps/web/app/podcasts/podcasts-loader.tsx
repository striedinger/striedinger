import type { Podcast, PodcastShow } from "./types";

import { JsonLd } from "../../components/json-ld";
import {
  getPodcastShow,
  getPopularPodcasts,
  searchPodcastCatalog,
} from "../../lib/podcasts/apple-podcasts";
import { createWebApplicationStructuredData } from "../../lib/seo";
import { loadPodcastMessages } from "../../messages/podcasts/load-messages";
import { getRequestLocale } from "../get-request-locale";
import { parsePodcastRoute } from "./podcast-route";
import { PodcastsApp } from "./podcasts-app";

interface PodcastsLoaderProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function PodcastsLoader({ searchParams }: PodcastsLoaderProps) {
  const [locale, resolvedSearchParams] = await Promise.all([getRequestLocale(), searchParams]);
  const route = parsePodcastRoute({
    get(name) {
      const value = resolvedSearchParams[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });
  const [messages, popular, search, show] = await Promise.all([
    loadPodcastMessages(locale),
    getPopularPodcasts().catch(function useEmptyChart(): Podcast[] {
      return [];
    }),
    route.query
      ? searchPodcastCatalog(route.query).then(
          function useResults(results) {
            return { failed: false, results };
          },
          function reportFailure() {
            return { failed: true, results: [] as Podcast[] };
          },
        )
      : Promise.resolve({ failed: false, results: [] as Podcast[] }),
    route.podcastId
      ? getPodcastShow(route.podcastId).then(
          function createShow([podcast, episodes]): PodcastShow | null {
            return podcast ? { podcast, episodes } : null;
          },
          function useUnavailableShow() {
            return null;
          },
        )
      : Promise.resolve(null),
  ]);
  const description =
    messages[
      "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device."
    ];
  const structuredData = createWebApplicationStructuredData({
    name: messages.Podcasts,
    description,
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
      <PodcastsApp
        locale={locale}
        messages={messages}
        popular={popular}
        searchFailed={search.failed}
        searchQuery={route.query}
        searchResults={search.results}
        show={show}
      />
    </>
  );
}
