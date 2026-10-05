"use client";

import { createContext, use } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { Podcast, PodcastMessages, PodcastQueueItem } from "./types";

export interface PodcastsContextValue {
  aiLabels: OnDeviceAiLabels;
  /** Closes Now Playing and pushes the item's show, unless it is already showing. */
  goToShow: (item: PodcastQueueItem) => void;
  locale: string;
  messages: PodcastMessages;
  /** The time relative dates are measured from, fixed while the app is open. */
  now: number;
  shareEpisode: (item: PodcastQueueItem) => void;
  shareShow: (podcast: Podcast) => void;
}

export interface PodcastsSearchContextValue {
  /** What the search field shows, which leads the URL while a search is pending. */
  inputValue: string;
  searchNow: (query: string) => void;
}

export const PodcastsContext = createContext<PodcastsContextValue | null>(null);
export const PodcastsSearchContext = createContext<PodcastsSearchContextValue | null>(null);

/** Locale, messages, and app-wide actions provided by the Podcasts layout. */
export function usePodcasts() {
  const value = use(PodcastsContext);
  if (!value) throw new Error("usePodcasts must be used inside the Podcasts layout.");
  return value;
}

export function usePodcastsSearch() {
  const value = use(PodcastsSearchContext);
  if (!value) throw new Error("usePodcastsSearch must be used inside the Podcasts layout.");
  return value;
}
