import type { Podcast, PodcastQueueItem } from "./types";

const knownPodcasts = new Map<string, Podcast>();
const knownEpisodes = new Map<string, PodcastQueueItem>();

/**
 * Remembers a show or episode the user is about to open from a list, so its screen can
 * render the header immediately while the server streams the rest.
 */
export function rememberPodcast(podcast: Podcast) {
  knownPodcasts.set(podcast.id, podcast);
}

export function rememberEpisode(item: PodcastQueueItem) {
  rememberPodcast(item.podcast);
  knownEpisodes.set(item.episode.id, item);
}

export function findKnownPodcast(podcastId: string) {
  return knownPodcasts.get(podcastId) ?? null;
}

export function findKnownEpisode(podcastId: string, episodeId: string) {
  const item = knownEpisodes.get(episodeId);
  return item?.podcast.id === podcastId ? item : null;
}
