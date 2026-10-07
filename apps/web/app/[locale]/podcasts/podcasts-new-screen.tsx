"use client";

import { Suspense } from "react";

import type { NewEpisodes } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosScreen } from "../../../components/ios/ios-screen";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { usePodcasts } from "./podcasts-context";
import { PodcastsNewFeed } from "./podcasts-new-feed";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastsNewScreenProps {
  /** The latest episodes for the shows in the URL, streaming from the server. */
  episodes: Promise<NewEpisodes>;
}

export function PodcastsNewScreen({ episodes }: PodcastsNewScreenProps) {
  const { messages } = usePodcasts();
  const skeleton = <EpisodeListSkeleton label={messages["Loading episodes"]} />;

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar title={messages.New} leading={<IosAppSwitcherButton />} />
      <Suspense fallback={skeleton}>
        <PodcastsNewFeed episodes={episodes} skeleton={skeleton} />
      </Suspense>
    </IosScreen>
  );
}
