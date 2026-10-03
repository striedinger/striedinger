"use client";

import { useSyncExternalStore } from "react";

import type { Podcast, PodcastEpisode, PodcastProgress, PodcastQueueItem } from "./types";

import { readStoredValue, removeStoredValue, writeStoredValue } from "../../lib/browser-storage";
import {
  readPodcastProgress,
  removePodcastProgress,
  savePodcastProgress,
} from "./podcast-progress";
import { isPodcast, isQueueItem } from "./podcast-validation";

export interface PodcastLibraryState {
  followed: readonly Podcast[];
  playedEpisodeIds: ReadonlySet<string>;
  progress: readonly PodcastProgress[];
  saved: readonly PodcastQueueItem[];
}

const followedStorageKey = "podcast-library:v1";
const savedStorageKey = "podcast-saved:v1";
const playedStorageKey = "podcast-played:v1";
const maximumFollowed = 100;
const maximumSaved = 100;
const maximumPlayed = 500;

const emptyLibrary: PodcastLibraryState = {
  followed: [],
  playedEpisodeIds: new Set(),
  progress: [],
  saved: [],
};

let libraryState: PodcastLibraryState | null = null;
const listeners = new Set<() => void>();

function readJson(key: string): unknown {
  try {
    const value = readStoredValue(key);
    return value ? (JSON.parse(value) as unknown) : null;
  } catch {
    removeStoredValue(key);
    return null;
  }
}

function readFollowed(): Podcast[] {
  const stored = readJson(followedStorageKey);
  if (!stored || typeof stored !== "object") return [];
  const library = stored as { podcasts?: unknown; version?: unknown };
  if (library.version !== 1 && library.version !== 2) return [];
  if (!Array.isArray(library.podcasts)) return [];
  return library.podcasts.filter(isPodcast).slice(0, maximumFollowed);
}

function readSaved(): PodcastQueueItem[] {
  const stored = readJson(savedStorageKey);
  if (!stored || typeof stored !== "object") return [];
  const saved = stored as { items?: unknown; version?: unknown };
  if (saved.version !== 1 || !Array.isArray(saved.items)) return [];
  return saved.items.filter(isQueueItem).slice(0, maximumSaved);
}

function readPlayed(): Set<string> {
  const stored = readJson(playedStorageKey);
  if (!stored || typeof stored !== "object") return new Set();
  const played = stored as { ids?: unknown; version?: unknown };
  if (played.version !== 1 || !Array.isArray(played.ids)) return new Set();
  return new Set(
    played.ids.filter(function isId(id): id is string {
      return typeof id === "string";
    }),
  );
}

function readLibrary(): PodcastLibraryState {
  return {
    followed: readFollowed(),
    playedEpisodeIds: readPlayed(),
    progress: readPodcastProgress(),
    saved: readSaved(),
  };
}

function getLibrarySnapshot(): PodcastLibraryState {
  libraryState ??= readLibrary();
  return libraryState;
}

function getServerLibrarySnapshot(): PodcastLibraryState {
  return emptyLibrary;
}

function subscribeToLibrary(listener: () => void) {
  listeners.add(listener);
  function synchronizeOtherTabs(event: StorageEvent) {
    if (event.key === null || event.key.startsWith("podcast-")) {
      libraryState = readLibrary();
      listener();
    }
  }
  window.addEventListener("storage", synchronizeOtherTabs);
  return function unsubscribeFromLibrary() {
    listeners.delete(listener);
    window.removeEventListener("storage", synchronizeOtherTabs);
  };
}

function updateLibrary(update: Partial<PodcastLibraryState>) {
  libraryState = { ...getLibrarySnapshot(), ...update };
  for (const listener of listeners) listener();
}

export function usePodcastLibrary() {
  return useSyncExternalStore(subscribeToLibrary, getLibrarySnapshot, getServerLibrarySnapshot);
}

export function toggleFollowedPodcast(podcast: Podcast) {
  const { followed } = getLibrarySnapshot();
  const isFollowed = followed.some(function matchesPodcast(item) {
    return item.id === podcast.id;
  });
  const nextFollowed = isFollowed
    ? followed.filter(function keepOtherPodcast(item) {
        return item.id !== podcast.id;
      })
    : [podcast, ...followed].slice(0, maximumFollowed);
  writeStoredValue(followedStorageKey, JSON.stringify({ version: 2, podcasts: nextFollowed }));
  updateLibrary({ followed: nextFollowed });
}

export function toggleSavedEpisode(item: PodcastQueueItem) {
  const { saved } = getLibrarySnapshot();
  const isSaved = saved.some(function matchesEpisode(savedItem) {
    return savedItem.episode.id === item.episode.id;
  });
  const nextSaved = isSaved
    ? saved.filter(function keepOtherEpisode(savedItem) {
        return savedItem.episode.id !== item.episode.id;
      })
    : [item, ...saved].slice(0, maximumSaved);
  writeStoredValue(savedStorageKey, JSON.stringify({ version: 1, items: nextSaved }));
  updateLibrary({ saved: nextSaved });
}

export function setEpisodePlayed(episodeId: string, played: boolean) {
  const nextPlayed = new Set(getLibrarySnapshot().playedEpisodeIds);
  if (played) nextPlayed.add(episodeId);
  else nextPlayed.delete(episodeId);
  const ids = Array.from(nextPlayed).slice(-maximumPlayed);
  writeStoredValue(playedStorageKey, JSON.stringify({ version: 1, ids }));
  updateLibrary({
    playedEpisodeIds: new Set(ids),
    progress: played ? removePodcastProgress(episodeId) : getLibrarySnapshot().progress,
  });
}

export function recordEpisodeProgress(
  podcast: Podcast,
  episode: PodcastEpisode,
  positionSeconds: number,
  durationSeconds: number,
) {
  updateLibrary({
    progress: savePodcastProgress(podcast, episode, positionSeconds, durationSeconds),
  });
}

export function clearEpisodeProgress(episodeId: string) {
  updateLibrary({ progress: removePodcastProgress(episodeId) });
}

export function getSavedProgress(episodeId: string) {
  return getLibrarySnapshot().progress.find(function matchesEpisode(item) {
    return item.episode.id === episodeId;
  });
}
