import type { Podcast, PodcastEpisode, PodcastQueueItem } from "./types";

export function isPodcast(value: unknown): value is Podcast {
  if (!value || typeof value !== "object") return false;
  const podcast = value as Partial<Podcast>;
  return (
    typeof podcast.id === "string" &&
    typeof podcast.title === "string" &&
    typeof podcast.author === "string" &&
    typeof podcast.artworkUrl === "string" &&
    typeof podcast.genre === "string" &&
    typeof podcast.url === "string" &&
    (podcast.episodeCount === undefined ||
      (typeof podcast.episodeCount === "number" && Number.isSafeInteger(podcast.episodeCount))) &&
    (podcast.explicit === undefined || typeof podcast.explicit === "boolean") &&
    (podcast.latestReleaseAt === undefined || typeof podcast.latestReleaseAt === "string")
  );
}

export function isEpisode(value: unknown): value is PodcastEpisode {
  if (!value || typeof value !== "object") return false;
  const episode = value as Partial<PodcastEpisode>;
  return (
    typeof episode.id === "string" &&
    typeof episode.title === "string" &&
    typeof episode.audioUrl === "string" &&
    typeof episode.description === "string" &&
    typeof episode.durationMilliseconds === "number" &&
    typeof episode.publishedAt === "string"
  );
}

export function isQueueItem(value: unknown): value is PodcastQueueItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PodcastQueueItem>;
  return isPodcast(item.podcast) && isEpisode(item.episode);
}
