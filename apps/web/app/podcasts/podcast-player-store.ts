"use client";

import { useSyncExternalStore } from "react";

import type { PodcastQueueItem } from "./types";

import { readStoredValue, removeStoredValue, writeStoredValue } from "../../lib/browser-storage";
import {
  clearEpisodeProgress,
  getSavedProgress,
  recordEpisodeProgress,
  setEpisodePlayed,
} from "./podcast-library-store";
import { isQueueItem } from "./podcast-validation";

type SleepTimer = { endsAt: number; kind: "time"; minutes: number } | { kind: "episode" };

export interface PodcastPlayerState {
  current: PodcastQueueItem | null;
  duration: number;
  hasError: boolean;
  isBuffering: boolean;
  isPlaying: boolean;
  playbackRate: number;
  queue: readonly PodcastQueueItem[];
  sleepTimer: SleepTimer | null;
  volume: number;
}

export const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const skipBackwardSeconds = 15;
export const skipForwardSeconds = 30;

const nowPlayingStorageKey = "podcast-now-playing:v1";
const queueStorageKey = "podcast-queue:v1";
const playbackRateStorageKey = "podcast-playback-rate:v1";
const progressSaveIntervalMilliseconds = 5_000;
const maximumQueueLength = 50;

const initialPlayerState: PodcastPlayerState = {
  current: null,
  duration: 0,
  hasError: false,
  isBuffering: false,
  isPlaying: false,
  playbackRate: 1,
  queue: [],
  sleepTimer: null,
  volume: 1,
};

let playerState: PodcastPlayerState | null = null;
let audioElement: HTMLAudioElement | null = null;
let loadedEpisodeId: string | null = null;
let pendingStartPosition = 0;
let lastProgressSave = 0;
let sleepTimeout: number | null = null;
const stateListeners = new Set<() => void>();
const timeListeners = new Set<() => void>();

function readJson(key: string): unknown {
  try {
    const value = readStoredValue(key);
    return value ? (JSON.parse(value) as unknown) : null;
  } catch {
    removeStoredValue(key);
    return null;
  }
}

function readInitialPlayerState(): PodcastPlayerState {
  const storedCurrent = readJson(nowPlayingStorageKey);
  const storedQueue = readJson(queueStorageKey);
  const storedRate = Number(readStoredValue(playbackRateStorageKey));
  const current = isQueueItem(storedCurrent) ? storedCurrent : null;
  pendingStartPosition = current ? (getSavedProgress(current.episode.id)?.positionSeconds ?? 0) : 0;
  return {
    ...initialPlayerState,
    current,
    duration: current ? current.episode.durationMilliseconds / 1_000 : 0,
    playbackRate: playbackRates.some(function matchesRate(rate) {
      return rate === storedRate;
    })
      ? storedRate
      : 1,
    queue: Array.isArray(storedQueue)
      ? storedQueue.filter(isQueueItem).slice(0, maximumQueueLength)
      : [],
  };
}

function getPlayerSnapshot() {
  playerState ??= readInitialPlayerState();
  return playerState;
}

function getServerPlayerSnapshot() {
  return initialPlayerState;
}

interface PodcastPlayerItems {
  current: PodcastQueueItem | null;
  queue: readonly PodcastQueueItem[];
}

let playerItems: PodcastPlayerItems | null = null;

function getPlayerItemsSnapshot(): PodcastPlayerItems {
  const { current, queue } = getPlayerSnapshot();
  if (!playerItems || playerItems.current !== current || playerItems.queue !== queue) {
    playerItems = { current, queue };
  }
  return playerItems;
}

const serverPlayerItems: PodcastPlayerItems = { current: null, queue: [] };

function getServerPlayerItemsSnapshot() {
  return serverPlayerItems;
}

function setPlayerState(update: Partial<PodcastPlayerState>) {
  playerState = { ...getPlayerSnapshot(), ...update };
  for (const listener of stateListeners) listener();
}

function subscribeToPlayer(listener: () => void) {
  stateListeners.add(listener);
  return function unsubscribeFromPlayer() {
    stateListeners.delete(listener);
  };
}

function subscribeToPlaybackTime(listener: () => void) {
  timeListeners.add(listener);
  return function unsubscribeFromPlaybackTime() {
    timeListeners.delete(listener);
  };
}

function getPlaybackTime() {
  const current = getPlayerSnapshot().current;
  if (!current) return 0;
  return audioElement && loadedEpisodeId === current.episode.id
    ? audioElement.currentTime
    : pendingStartPosition;
}

function getServerPlaybackTime() {
  return 0;
}

export function usePodcastPlayer() {
  return useSyncExternalStore(subscribeToPlayer, getPlayerSnapshot, getServerPlayerSnapshot);
}

/**
 * Subscribes only to the current episode and queue, so play, pause, and buffering changes do
 * not re-render components that just need to know what is loaded.
 */
export function usePodcastPlayerItems() {
  return useSyncExternalStore(
    subscribeToPlayer,
    getPlayerItemsSnapshot,
    getServerPlayerItemsSnapshot,
  );
}

/** Subscribes to the playhead separately so only time-based UI re-renders while audio plays. */
export function usePlaybackTime() {
  return useSyncExternalStore(subscribeToPlaybackTime, getPlaybackTime, getServerPlaybackTime);
}

function notifyTimeListeners() {
  for (const listener of timeListeners) listener();
}

function persistQueue(queue: readonly PodcastQueueItem[]) {
  writeStoredValue(queueStorageKey, JSON.stringify(queue));
}

function persistCurrent(current: PodcastQueueItem | null) {
  if (current) writeStoredValue(nowPlayingStorageKey, JSON.stringify(current));
  else removeStoredValue(nowPlayingStorageKey);
}

function saveCurrentProgress() {
  const { current } = getPlayerSnapshot();
  const audio = audioElement;
  if (!current || !audio || loadedEpisodeId !== current.episode.id) return;
  lastProgressSave = Date.now();
  recordEpisodeProgress(current.podcast, current.episode, audio.currentTime, audio.duration);
}

function getAudio(): HTMLAudioElement {
  if (audioElement) return audioElement;
  const audio = new Audio();
  audio.preload = "metadata";
  audio.addEventListener("play", function markPlaying() {
    setPlayerState({ isPlaying: true, hasError: false });
    synchronizeMediaSessionState();
  });
  audio.addEventListener("playing", function markReady() {
    setPlayerState({ isBuffering: false });
  });
  audio.addEventListener("waiting", function markBuffering() {
    setPlayerState({ isBuffering: true });
  });
  audio.addEventListener("pause", function markPaused() {
    setPlayerState({ isPlaying: false, isBuffering: false });
    saveCurrentProgress();
    synchronizeMediaSessionState();
  });
  audio.addEventListener("durationchange", function updateDuration() {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setPlayerState({ duration: audio.duration });
      synchronizeMediaSessionState();
    }
  });
  audio.addEventListener("loadedmetadata", function restoreStartPosition() {
    if (pendingStartPosition > 0 && pendingStartPosition < audio.duration - 1) {
      audio.currentTime = pendingStartPosition;
    }
    pendingStartPosition = 0;
  });
  audio.addEventListener("timeupdate", function reportTime() {
    notifyTimeListeners();
    if (!audio.paused && Date.now() - lastProgressSave > progressSaveIntervalMilliseconds) {
      saveCurrentProgress();
    }
  });
  audio.addEventListener("seeked", function reportSeek() {
    notifyTimeListeners();
    synchronizeMediaSessionState();
  });
  audio.addEventListener("ended", finishCurrentEpisode);
  audio.addEventListener("error", function markUnavailable() {
    setPlayerState({ hasError: true, isBuffering: false, isPlaying: false });
  });
  window.addEventListener("pagehide", saveCurrentProgress);
  audioElement = audio;
  return audio;
}

function loadEpisode(item: PodcastQueueItem, startPosition: number) {
  const audio = getAudio();
  pendingStartPosition = startPosition;
  loadedEpisodeId = item.episode.id;
  audio.src = item.episode.audioUrl;
  audio.playbackRate = getPlayerSnapshot().playbackRate;
  audio.defaultPlaybackRate = getPlayerSnapshot().playbackRate;
}

function startPlayback() {
  const audio = getAudio();
  setPlayerState({ isBuffering: audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA });
  audio.play().catch(function reportBlockedPlayback(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setPlayerState({ isBuffering: false, isPlaying: false });
  });
}

export function playEpisode(
  item: PodcastQueueItem,
  { fromStart = false }: { fromStart?: boolean } = {},
) {
  const state = getPlayerSnapshot();
  if (
    state.current?.episode.id === item.episode.id &&
    loadedEpisodeId === item.episode.id &&
    !fromStart
  ) {
    startPlayback();
    return;
  }
  saveCurrentProgress();
  const savedPosition = fromStart ? 0 : (getSavedProgress(item.episode.id)?.positionSeconds ?? 0);
  const queue = state.queue.filter(function keepOtherEpisode(queued) {
    return queued.episode.id !== item.episode.id;
  });
  persistQueue(queue);
  persistCurrent(item);
  setPlayerState({
    current: item,
    duration: item.episode.durationMilliseconds / 1_000,
    hasError: false,
    queue,
  });
  updateMediaSessionMetadata(item);
  loadEpisode(item, savedPosition);
  startPlayback();
  notifyTimeListeners();
}

export function togglePlayback() {
  const { current } = getPlayerSnapshot();
  if (!current) return;
  if (loadedEpisodeId !== current.episode.id) {
    updateMediaSessionMetadata(current);
    loadEpisode(
      current,
      getSavedProgress(current.episode.id)?.positionSeconds ?? pendingStartPosition,
    );
    startPlayback();
    return;
  }
  const audio = getAudio();
  if (audio.paused) startPlayback();
  else audio.pause();
}

export function pausePlayback() {
  if (audioElement && !audioElement.paused) audioElement.pause();
}

export function seekTo(seconds: number) {
  const { current, duration } = getPlayerSnapshot();
  if (!current) return;
  const position = Math.max(0, Math.min(duration || Number.POSITIVE_INFINITY, seconds));
  if (loadedEpisodeId !== current.episode.id) {
    pendingStartPosition = position;
    notifyTimeListeners();
    return;
  }
  getAudio().currentTime = position;
  notifyTimeListeners();
}

function skipBy(seconds: number) {
  seekTo(getPlaybackTime() + seconds);
}

export function skipBackward() {
  skipBy(-skipBackwardSeconds);
}

export function skipForward() {
  skipBy(skipForwardSeconds);
}

export function setPlaybackRate(rate: number) {
  writeStoredValue(playbackRateStorageKey, String(rate));
  if (audioElement) {
    audioElement.playbackRate = rate;
    audioElement.defaultPlaybackRate = rate;
  }
  setPlayerState({ playbackRate: rate });
  synchronizeMediaSessionState();
}

export function setVolume(volume: number) {
  const normalizedVolume = Math.min(1, Math.max(0, volume));
  getAudio().volume = normalizedVolume;
  setPlayerState({ volume: normalizedVolume });
}

export function setSleepTimer(minutes: number | "episode" | null) {
  if (sleepTimeout !== null) window.clearTimeout(sleepTimeout);
  sleepTimeout = null;
  if (minutes === null) {
    setPlayerState({ sleepTimer: null });
    return;
  }
  if (minutes === "episode") {
    setPlayerState({ sleepTimer: { kind: "episode" } });
    return;
  }
  const endsAt = Date.now() + minutes * 60_000;
  sleepTimeout = window.setTimeout(function pauseForSleep() {
    sleepTimeout = null;
    pausePlayback();
    setPlayerState({ sleepTimer: null });
  }, minutes * 60_000);
  setPlayerState({ sleepTimer: { kind: "time", endsAt, minutes } });
}

export function enqueueEpisode(item: PodcastQueueItem, position: "next" | "last") {
  const { current, queue } = getPlayerSnapshot();
  if (!current) {
    playEpisode(item);
    return;
  }
  if (current.episode.id === item.episode.id) return;
  const otherItems = queue.filter(function keepOtherEpisode(queued) {
    return queued.episode.id !== item.episode.id;
  });
  const nextQueue = (position === "next" ? [item, ...otherItems] : [...otherItems, item]).slice(
    0,
    maximumQueueLength,
  );
  persistQueue(nextQueue);
  setPlayerState({ queue: nextQueue });
}

export function removeFromQueue(episodeId: string) {
  const nextQueue = getPlayerSnapshot().queue.filter(function keepOtherEpisode(queued) {
    return queued.episode.id !== episodeId;
  });
  persistQueue(nextQueue);
  setPlayerState({ queue: nextQueue });
}

function playNextInQueue() {
  const [nextItem] = getPlayerSnapshot().queue;
  if (nextItem) playEpisode(nextItem);
}

function closePlayer() {
  saveCurrentProgress();
  pausePlayback();
  if (audioElement) {
    audioElement.removeAttribute("src");
    audioElement.load();
  }
  loadedEpisodeId = null;
  pendingStartPosition = 0;
  persistCurrent(null);
  setSleepTimer(null);
  setPlayerState({
    current: null,
    duration: 0,
    hasError: false,
    isBuffering: false,
    isPlaying: false,
  });
  clearMediaSession();
}

function finishCurrentEpisode() {
  const { current, queue, sleepTimer } = getPlayerSnapshot();
  if (!current) return;
  clearEpisodeProgress(current.episode.id);
  setEpisodePlayed(current.episode.id, true);
  const [nextItem] = queue;
  if (sleepTimer?.kind === "episode") {
    setSleepTimer(null);
    closePlayer();
    return;
  }
  if (nextItem) playEpisode(nextItem, { fromStart: true });
  else closePlayer();
}

function updateMediaSessionMetadata(item: PodcastQueueItem) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  navigator.mediaSession.metadata = new MediaMetadata({
    album: item.podcast.title,
    artist: item.podcast.author,
    artwork: [{ src: item.podcast.artworkUrl, sizes: "600x600", type: "image/jpeg" }],
    title: item.episode.title,
  });
  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ["play", togglePlayback],
    ["pause", pausePlayback],
    [
      "seekbackward",
      function seekBackward(details) {
        skipBy(-(details.seekOffset ?? skipBackwardSeconds));
      },
    ],
    [
      "seekforward",
      function seekForward(details) {
        skipBy(details.seekOffset ?? skipForwardSeconds);
      },
    ],
    [
      "seekto",
      function seekToPosition(details) {
        if (typeof details.seekTime === "number") seekTo(details.seekTime);
      },
    ],
    ["nexttrack", playNextInQueue],
  ];
  for (const [action, handler] of handlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Browsers may expose Media Session without supporting every action.
    }
  }
}

function synchronizeMediaSessionState() {
  if (!("mediaSession" in navigator) || !audioElement) return;
  const audio = audioElement;
  navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
  if (
    typeof navigator.mediaSession.setPositionState === "function" &&
    Number.isFinite(audio.duration) &&
    audio.duration > 0
  ) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {
      // Some browsers reject position updates while metadata is still loading.
    }
  }
}

function clearMediaSession() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";
}
