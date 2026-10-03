"use client";

import { use } from "react";

import type { PodcastShow } from "./types";

import { PodcastEpisodePage } from "./podcast-episode-page";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";
import { usePodcasts } from "./podcasts-context";

interface PodcastStreamedEpisodeProps {
  episodeId: string | null;
  show: Promise<PodcastShow | null>;
}

/** An episode the app had not seen in any list, rendered once its show arrives. */
export function PodcastStreamedEpisode({ episodeId, show }: PodcastStreamedEpisodeProps) {
  const { messages } = usePodcasts();
  const resolvedShow = use(show);
  const episode = resolvedShow?.episodes.find(function matchesRoute(showEpisode) {
    return showEpisode.id === episodeId;
  });
  if (!resolvedShow || !episode) {
    return <PodcastStackPlaceholder message={messages["This episode is no longer available."]} />;
  }
  return <PodcastEpisodePage item={{ podcast: resolvedShow.podcast, episode }} />;
}
