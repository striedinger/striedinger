"use client";

import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";
import { Suspense, use, type ReactNode } from "react";
import { browser } from "react-dom";

import type { NewEpisodes } from "./types";

import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosRevealTransition } from "../../../components/ios/ios-reveal-transition";
import { useFollowedPodcasts } from "./podcast-library-store";
import { normalizeFollowedIds } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";
import { PodcastsNewEpisodes } from "./podcasts-new-episodes";

interface PodcastsNewFeedProps {
  episodes: Promise<NewEpisodes>;
  skeleton: ReactNode;
}

/**
 * The latest episodes from followed shows. Followed shows live in this browser, so the server
 * leaves the feed to the browser, which renders it with the stored shows on its first pass.
 */
export function PodcastsNewFeed({ episodes, skeleton }: PodcastsNewFeedProps) {
  use(browser("Followed shows are stored in the browser."));
  const { messages } = usePodcasts();
  const followedIds = normalizeFollowedIds(
    useFollowedPodcasts().map(function selectPodcastId(podcast) {
      return podcast.id;
    }),
  );

  if (followedIds.length === 0) {
    return (
      <IosContentUnavailable
        icon={<SquareGridFillIcon />}
        title={messages.New}
        description={messages["New episodes from shows you follow will appear here."]}
      />
    );
  }
  return (
    <Suspense fallback={<IosRevealTransition>{skeleton}</IosRevealTransition>}>
      <IosRevealTransition>
        <PodcastsNewEpisodes episodes={episodes} followedIds={followedIds} />
      </IosRevealTransition>
    </Suspense>
  );
}
