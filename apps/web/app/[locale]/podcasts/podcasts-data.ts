import type { NewEpisodes, Podcast, PodcastSearchResults, PodcastShow } from "./types";

import {
  getPodcastShow,
  getPopularPodcasts,
  searchPodcastCatalog,
} from "../../../lib/podcasts/apple-podcasts";
import { normalizeFollowedIds, normalizePodcastId, normalizeSearchQuery } from "./podcast-route";

const maximumNewEpisodes = 60;

export function loadPopularPodcasts(): Promise<Podcast[]> {
  return getPopularPodcasts().catch(function useEmptyChart(): Podcast[] {
    return [];
  });
}

/** A show and its episodes, or null when the id is invalid or the show is unavailable. */
export async function loadPodcastShow(showId: string): Promise<PodcastShow | null> {
  const podcastId = normalizePodcastId(showId);
  if (!podcastId) return null;
  try {
    const [podcast, episodes] = await getPodcastShow(podcastId);
    return podcast ? { podcast, episodes } : null;
  } catch {
    return null;
  }
}

export async function loadSearchResults(query: string | null): Promise<PodcastSearchResults> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return { failed: false, query: "", results: [] };
  try {
    return {
      failed: false,
      query: normalizedQuery,
      results: await searchPodcastCatalog(normalizedQuery),
    };
  } catch {
    return { failed: true, query: normalizedQuery, results: [] };
  }
}

/** Latest episodes across followed shows for the New tab, newest first. */
export async function loadNewEpisodes(showIdList: string | null): Promise<NewEpisodes> {
  const showIds = normalizeFollowedIds((showIdList ?? "").split(","));
  if (showIds.length === 0) return { items: [], showIds };
  const shows = await Promise.all(showIds.map(loadPodcastShow));
  const items = shows
    .flatMap(function createItems(show) {
      return show
        ? show.episodes.slice(0, 6).map(function createItem(episode) {
            return { podcast: show.podcast, episode };
          })
        : [];
    })
    .toSorted(function compareNewest(first, second) {
      return Date.parse(second.episode.publishedAt) - Date.parse(first.episode.publishedAt);
    })
    .slice(0, maximumNewEpisodes);
  return { items, showIds };
}
