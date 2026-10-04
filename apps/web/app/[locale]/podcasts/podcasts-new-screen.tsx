"use client";

import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";
import { Suspense } from "react";

import type { NewEpisodes } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosRevealTransition } from "../../../components/ios/ios-reveal-transition";
import { IosScreen } from "../../../components/ios/ios-screen";
import { useIsHydrated } from "../../../components/use-is-hydrated";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { useFollowedPodcasts } from "./podcast-library-store";
import { normalizeFollowedIds } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";
import { PodcastsNewEpisodes } from "./podcasts-new-episodes";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastsNewScreenProps {
  /** The latest episodes for the shows in the URL, streaming from the server. */
  episodes: Promise<NewEpisodes>;
}

export function PodcastsNewScreen({ episodes }: PodcastsNewScreenProps) {
  const { messages } = usePodcasts();
  const isHydrated = useIsHydrated();
  const followedIds = normalizeFollowedIds(
    useFollowedPodcasts().map(function selectPodcastId(podcast) {
      return podcast.id;
    }),
  );
  const skeleton = <EpisodeListSkeleton label={messages["Loading episodes"]} />;

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar title={messages.New} leading={<IosAppSwitcherButton />} />
      {/* Followed shows live in this browser, so the server renders a placeholder for them. */}
      {!isHydrated ? (
        skeleton
      ) : followedIds.length === 0 ? (
        <IosContentUnavailable
          icon={<SquareGridFillIcon />}
          title={messages.New}
          description={messages["New episodes from shows you follow will appear here."]}
        />
      ) : (
        <Suspense fallback={<IosRevealTransition>{skeleton}</IosRevealTransition>}>
          <IosRevealTransition>
            <PodcastsNewEpisodes episodes={episodes} followedIds={followedIds} />
          </IosRevealTransition>
        </Suspense>
      )}
    </IosScreen>
  );
}
