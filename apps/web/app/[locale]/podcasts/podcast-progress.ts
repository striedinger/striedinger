import type { Podcast, PodcastEpisode, PodcastProgress } from "./types";

import { readStoredValue, removeStoredValue, writeStoredValue } from "../../../lib/browser-storage";
import { isEpisode, isPodcast } from "./podcast-validation";

const progressStorageKey = "podcast-progress:v1";
const maximumProgressItems = 30;

interface StoredProgress {
  items: PodcastProgress[];
  version: 1;
}

export function readPodcastProgress(): PodcastProgress[] {
  try {
    const storedValue = readStoredValue(progressStorageKey);
    if (!storedValue) return [];
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!isStoredProgress(parsedValue)) throw new Error("Invalid podcast progress");
    return parsedValue.items.slice(0, maximumProgressItems);
  } catch {
    removeStoredValue(progressStorageKey);
    return [];
  }
}

export function savePodcastProgress(
  podcast: Podcast,
  episode: PodcastEpisode,
  positionSeconds: number,
  durationSeconds: number,
  // Callers holding the stored list pass it so playback saves skip re-parsing storage.
  currentItems: readonly PodcastProgress[] = readPodcastProgress(),
): PodcastProgress[] {
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

/** Prefers the duration measured during playback; a saved duration of 0 means it was unknown. */
export function getEpisodeDurationSeconds(
  episode: PodcastEpisode,
  progress: PodcastProgress | undefined,
): number {
  return progress !== undefined && progress.durationSeconds > 0
    ? progress.durationSeconds
    : episode.durationMilliseconds / 1_000;
}

export function removePodcastProgress(
  episodeId: string,
  currentItems: readonly PodcastProgress[] = readPodcastProgress(),
): PodcastProgress[] {
  const nextItems = currentItems.filter(function keepOtherEpisode(item) {
    return item.episode.id !== episodeId;
  });
  writeProgress(nextItems);
  return nextItems;
}

function writeProgress(items: PodcastProgress[]) {
  const storedProgress: StoredProgress = { version: 1, items };
  writeStoredValue(progressStorageKey, JSON.stringify(storedProgress));
}

function isStoredProgress(value: unknown): value is StoredProgress {
  if (typeof value !== "object" || value === null) return false;
  const stored = value as Partial<StoredProgress>;
  return stored.version === 1 && Array.isArray(stored.items) && stored.items.every(isProgressItem);
}

function isProgressItem(value: unknown): value is PodcastProgress {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<PodcastProgress>;
  return (
    isPodcast(item.podcast) &&
    isEpisode(item.episode) &&
    typeof item.positionSeconds === "number" &&
    typeof item.durationSeconds === "number" &&
    typeof item.updatedAt === "string"
  );
}
