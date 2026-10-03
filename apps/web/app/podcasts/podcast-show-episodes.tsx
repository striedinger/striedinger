"use client";

import { Text } from "@workspace/ui/components/text";
import { use } from "react";

import type { Podcast, PodcastMessages, PodcastQueueItem, PodcastShow } from "./types";

import { EpisodeList } from "./episode-list";

interface PodcastShowEpisodesProps {
  getEpisodeHref: (item: PodcastQueueItem) => string;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onOpenEpisode: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  podcast: Podcast;
  show: Promise<PodcastShow | null>;
}

export function PodcastShowEpisodes({
  getEpisodeHref,
  locale,
  messages,
  now,
  onOpenEpisode,
  onShare,
  podcast,
  show,
}: PodcastShowEpisodesProps) {
  const episodes = use(show)?.episodes ?? [];
  if (episodes.length === 0) {
    return (
      <Text className="px-4 pt-4 text-[15px] text-(--ios-secondary-label)">
        {messages["Episodes are unavailable right now. Please try another show."]}
      </Text>
    );
  }
  const items = episodes.map(function createItem(episode) {
    return { podcast, episode };
  });

  return (
    <EpisodeList
      items={items}
      label={messages.Episodes}
      getHref={getEpisodeHref}
      locale={locale}
      messages={messages}
      now={now}
      onOpen={onOpenEpisode}
      onShare={onShare}
    />
  );
}
