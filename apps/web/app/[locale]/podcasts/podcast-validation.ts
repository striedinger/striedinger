import type { Podcast, PodcastEpisode, PodcastQueueItem } from "./types";

import { safeHttpsUrl, safeHttpUrl } from "../../../lib/podcasts/safe-url";

// Stored shows and episodes come from localStorage, which anything running on this origin
// can write, and their links reach window.open and audio.src, so schemes are checked again.

export function isPodcast(value: unknown): value is Podcast {
  if (typeof value !== "object" || value === null) return false;
  const podcast = value as Partial<Podcast>;
  return (
    typeof podcast.id === "string" &&
    typeof podcast.title === "string" &&
    typeof podcast.author === "string" &&
    typeof podcast.artworkUrl === "string" &&
    safeHttpsUrl(podcast.artworkUrl) !== "" &&
    typeof podcast.genre === "string" &&
    typeof podcast.url === "string" &&
    safeHttpsUrl(podcast.url) !== "" &&
    (podcast.episodeCount === undefined ||
      (typeof podcast.episodeCount === "number" && Number.isSafeInteger(podcast.episodeCount))) &&
    (podcast.explicit === undefined || typeof podcast.explicit === "boolean") &&
    (podcast.latestReleaseAt === undefined || typeof podcast.latestReleaseAt === "string")
  );
}

export function isEpisode(value: unknown): value is PodcastEpisode {
  if (typeof value !== "object" || value === null) return false;
  const episode = value as Partial<PodcastEpisode>;
  return (
    typeof episode.id === "string" &&
    typeof episode.title === "string" &&
    typeof episode.audioUrl === "string" &&
    safeHttpUrl(episode.audioUrl) !== "" &&
    typeof episode.description === "string" &&
    typeof episode.durationMilliseconds === "number" &&
    typeof episode.publishedAt === "string"
  );
}

export function isQueueItem(value: unknown): value is PodcastQueueItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<PodcastQueueItem>;
  return isPodcast(item.podcast) && isEpisode(item.episode);
}
