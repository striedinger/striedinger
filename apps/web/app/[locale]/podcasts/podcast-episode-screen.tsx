"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import type { PodcastQueueItem, PodcastShow } from "./types";

import { findKnownEpisode } from "./podcast-catalog";
import { PodcastEpisodePage } from "./podcast-episode-page";
import { usePodcastLibrary } from "./podcast-library-store";
import { usePodcastPlayerItems } from "./podcast-player-store";
import { normalizePodcastId } from "./podcast-route";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";
import { PodcastStreamedEpisode } from "./podcast-streamed-episode";

interface PodcastEpisodeScreenProps {
  /** The episode's show, streaming from the server. */
  show: Promise<PodcastShow | null>;
}

/**
 * An episode screen. Episodes opened from a list, Up Next, or the library render immediately;
 * a shared link waits for the episode's show to arrive.
 */
export function PodcastEpisodeScreen({ show }: PodcastEpisodeScreenProps) {
  const params = useParams<{ episodeId: string; showId: string }>();
  const podcastId = normalizePodcastId(params.showId);
  const episodeId = normalizePodcastId(params.episodeId);
  const library = usePodcastLibrary();
  const player = usePodcastPlayerItems();

  function matchesRoute(item: PodcastQueueItem) {
    return item.podcast.id === podcastId && item.episode.id === episodeId;
  }

  const knownItem =
    podcastId && episodeId
      ? (findKnownEpisode(podcastId, episodeId) ??
        [
          ...(player.current ? [player.current] : []),
          ...player.queue,
          ...library.saved,
          ...library.progress,
        ].find(matchesRoute))
      : undefined;

  if (knownItem) {
    return <PodcastEpisodePage item={{ podcast: knownItem.podcast, episode: knownItem.episode }} />;
  }
  return (
    <Suspense fallback={<PodcastStackPlaceholder />}>
      <PodcastStreamedEpisode episodeId={episodeId} show={show} />
    </Suspense>
  );
}
