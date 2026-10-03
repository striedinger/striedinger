"use client";

import { use } from "react";

import type { PodcastShow } from "./types";

import { PodcastEpisodePage, type PodcastEpisodePageProps } from "./podcast-episode-page";
import { PodcastShowPage, type PodcastShowPageProps } from "./podcast-show-page";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";

interface PodcastSharedDestinationProps {
  episodeId: string | null;
  episodePageProps: Omit<PodcastEpisodePageProps, "item">;
  show: Promise<PodcastShow | null>;
  showPageProps: Omit<PodcastShowPageProps, "podcast">;
}

/**
 * A show or episode opened from a shared link, before the app knows it from any list. It
 * suspends until the show streams in from the server, then renders the destination.
 */
export function PodcastSharedDestination({
  episodeId,
  episodePageProps,
  show,
  showPageProps,
}: PodcastSharedDestinationProps) {
  const resolvedShow = use(show);
  const episode = episodeId
    ? resolvedShow?.episodes.find(function matchesRoute(showEpisode) {
        return showEpisode.id === episodeId;
      })
    : undefined;

  if (resolvedShow && !episodeId) {
    return (
      <PodcastShowPage
        key={resolvedShow.podcast.id}
        podcast={resolvedShow.podcast}
        {...showPageProps}
      />
    );
  }
  if (resolvedShow && episode) {
    return (
      <PodcastEpisodePage
        key={episode.id}
        item={{ podcast: resolvedShow.podcast, episode }}
        {...episodePageProps}
      />
    );
  }
  return (
    <PodcastStackPlaceholder
      title={episodePageProps.messages.Episodes}
      message={
        episodePageProps.messages["Episodes are unavailable right now. Please try another show."]
      }
    />
  );
}
