"use client";

import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";
import { use, useEffect } from "react";

import type { NewEpisodes } from "./types";

import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { EpisodeList } from "./episode-list";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { getNewEpisodesHref } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";

interface PodcastsNewEpisodesProps {
  episodes: Promise<NewEpisodes>;
  followedIds: readonly string[];
}

/**
 * The New tab's episodes. They load on the server for the shows listed in the URL; when the
 * user follows or unfollows a show, the URL is updated so the list loads for the new set.
 */
export function PodcastsNewEpisodes({ episodes, followedIds }: PodcastsNewEpisodesProps) {
  const { messages } = usePodcasts();
  const iosRouter = useIosRouter();
  const { items, showIds } = use(episodes);
  const followedKey = followedIds.join(",");
  const isCurrent = showIds.join(",") === followedKey;

  useEffect(
    function loadEpisodesForFollowedShows() {
      if (isCurrent) return;
      iosRouter.replace(getNewEpisodesHref(followedKey.split(",")));
    },
    [followedKey, iosRouter, isCurrent],
  );

  if (!isCurrent) return <EpisodeListSkeleton label={messages["Loading episodes"]} />;
  if (items.length === 0) {
    return (
      <IosContentUnavailable
        icon={<SquareGridFillIcon />}
        title={messages.New}
        description={messages["New episodes from shows you follow will appear here."]}
      />
    );
  }
  return <EpisodeList items={items} label={messages.New} showsPodcastTitle />;
}
