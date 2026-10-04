"use client";

import { Text } from "@workspace/ui/components/text";
import { use } from "react";

import type { Podcast, PodcastShow } from "./types";

import { EpisodeList } from "./episode-list";
import { usePodcasts } from "./podcasts-context";

interface PodcastShowEpisodesProps {
  podcast: Podcast;
  show: Promise<PodcastShow | null>;
}

export function PodcastShowEpisodes({ podcast, show }: PodcastShowEpisodesProps) {
  const { messages } = usePodcasts();
  const episodes = use(show)?.episodes ?? [];
  if (episodes.length === 0) {
    return (
      <Text className="text-ios-secondary-label px-4 pt-4 text-[15px]">
        {messages["Episodes are unavailable right now. Please try another show."]}
      </Text>
    );
  }
  const items = episodes.map(function createItem(episode) {
    return { podcast, episode };
  });

  return <EpisodeList items={items} label={messages.Episodes} showsGoToShow={false} />;
}
