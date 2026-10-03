"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import type { PodcastShow } from "./types";

import { findKnownPodcast } from "./podcast-catalog";
import { useFollowedPodcasts } from "./podcast-library-store";
import { readSlugSegmentId } from "./podcast-route";
import { PodcastShowPage } from "./podcast-show-page";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";
import { PodcastStreamedShow } from "./podcast-streamed-show";

interface PodcastShowScreenProps {
  /** The show's details and episodes, streaming from the server. */
  show: Promise<PodcastShow | null>;
}

/**
 * A show screen. A show opened from a list renders its header immediately from what the list
 * knew while its episodes stream in; a shared link waits for the show to arrive.
 */
export function PodcastShowScreen({ show }: PodcastShowScreenProps) {
  const podcastId = readSlugSegmentId(useParams<{ show: string }>().show);
  const followedPodcasts = useFollowedPodcasts();
  const knownPodcast = podcastId
    ? (findKnownPodcast(podcastId) ??
      followedPodcasts.find(function matchesShow(podcast) {
        return podcast.id === podcastId;
      }))
    : undefined;

  if (knownPodcast) return <PodcastShowPage podcast={knownPodcast} show={show} />;
  return (
    <Suspense fallback={<PodcastStackPlaceholder />}>
      <PodcastStreamedShow show={show} />
    </Suspense>
  );
}
