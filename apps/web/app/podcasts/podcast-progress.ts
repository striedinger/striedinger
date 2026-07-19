import type { Podcast, PodcastEpisode, PodcastProgress } from "./types";

const progressStorageKey = "podcast-progress:v1";
const maximumProgressItems = 30;

interface StoredProgress {
  items: PodcastProgress[];
  version: 1;
}

export function readPodcastProgress(): PodcastProgress[] {
  try {
    const storedValue = window.localStorage.getItem(progressStorageKey);
    if (!storedValue) return [];
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!isStoredProgress(parsedValue)) throw new Error("Invalid podcast progress");
    return parsedValue.items.slice(0, maximumProgressItems);
  } catch {
    window.localStorage.removeItem(progressStorageKey);
    return [];
  }
}

export function savePodcastProgress(
  podcast: Podcast,
  episode: PodcastEpisode,
  positionSeconds: number,
  durationSeconds: number,
): PodcastProgress[] {
  const currentItems = readPodcastProgress();
  const otherItems = currentItems.filter(function keepOtherEpisode(item) {
    return item.episode.id !== episode.id;
  });
  const normalizedPosition = Number.isFinite(positionSeconds) ? Math.max(0, positionSeconds) : 0;
  const normalizedDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : Math.max(0, episode.durationMilliseconds / 1_000);
  const shouldKeep =
    normalizedPosition >= 5 &&
    (normalizedDuration === 0 || normalizedDuration - normalizedPosition > 10);
  const nextItems = shouldKeep
    ? [
        {
          podcast,
          episode,
          positionSeconds: normalizedPosition,
          durationSeconds: normalizedDuration,
          updatedAt: new Date().toISOString(),
        },
        ...otherItems,
      ].slice(0, maximumProgressItems)
    : otherItems;
  writeProgress(nextItems);
  return nextItems;
}

export function removePodcastProgress(episodeId: string): PodcastProgress[] {
  const nextItems = readPodcastProgress().filter(function keepOtherEpisode(item) {
    return item.episode.id !== episodeId;
  });
  writeProgress(nextItems);
  return nextItems;
}

function writeProgress(items: PodcastProgress[]) {
  const storedProgress: StoredProgress = { version: 1, items };
  window.localStorage.setItem(progressStorageKey, JSON.stringify(storedProgress));
}

function isStoredProgress(value: unknown): value is StoredProgress {
  if (!value || typeof value !== "object") return false;
  const stored = value as Partial<StoredProgress>;
  return stored.version === 1 && Array.isArray(stored.items) && stored.items.every(isProgressItem);
}

function isProgressItem(value: unknown): value is PodcastProgress {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PodcastProgress>;
  return (
    isPodcast(item.podcast) &&
    isEpisode(item.episode) &&
    typeof item.positionSeconds === "number" &&
    typeof item.durationSeconds === "number" &&
    typeof item.updatedAt === "string"
  );
}

function isPodcast(value: unknown): value is Podcast {
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

function isEpisode(value: unknown): value is PodcastEpisode {
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
