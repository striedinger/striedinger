import type { Podcast, PodcastQueueItem, PodcastShow } from "./types";

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
  // The show streams into its screen's Suspense boundaries instead of holding up the app.
  const show = route.podcastId
    ? getPodcastShow(route.podcastId).then(
        function createShow([podcast, episodes]): PodcastShow | null {
          return podcast ? { podcast, episodes } : null;
        },
        function useUnavailableShow() {
          return null;
        },
      )
    : Promise.resolve(null);
  const [messages, popular, search, newEpisodes] = await Promise.all([
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
    loadNewEpisodes(route.followedIds),
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
        showId={route.podcastId}
        newEpisodes={newEpisodes}
        newEpisodesShowIds={route.followedIds}
      />
    </>
  );
}

const maximumNewEpisodes = 60;

/** Latest episodes across followed shows for the New tab, newest first. */
async function loadNewEpisodes(showIds: readonly string[]): Promise<PodcastQueueItem[]> {
  if (showIds.length === 0) return [];
  const shows = await Promise.all(
    showIds.map(function loadShow(showId) {
      return getPodcastShow(showId).catch(function skipUnavailableShow() {
        return [null, []] as Awaited<ReturnType<typeof getPodcastShow>>;
      });
    }),
  );
  return shows
    .flatMap(function createItems([podcast, episodes]) {
      return podcast
        ? episodes.slice(0, 6).map(function createItem(episode) {
            return { podcast, episode };
          })
        : [];
    })
    .toSorted(function compareNewest(first, second) {
      return Date.parse(second.episode.publishedAt) - Date.parse(first.episode.publishedAt);
    })
    .slice(0, maximumNewEpisodes);
}
