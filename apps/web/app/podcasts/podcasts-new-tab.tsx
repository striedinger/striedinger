"use client";

import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";

import type { PodcastMessages, PodcastQueueItem } from "./types";

import { IosContentUnavailable } from "../../components/ios/ios-content-unavailable";
import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { EpisodeList } from "./episode-list";

interface PodcastsNewTabProps {
  getEpisodeHref: (item: PodcastQueueItem) => string;
  hasFollowedShows: boolean;
  isLoading: boolean;
  items: readonly PodcastQueueItem[];
  locale: string;
  messages: PodcastMessages;
  now: number;
  onGoToShow: (item: PodcastQueueItem) => void;
  onOpenEpisode: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
}

export function PodcastsNewTab({
  getEpisodeHref,
  hasFollowedShows,
  isLoading,
  items,
  locale,
  messages,
  now,
  onGoToShow,
  onOpenEpisode,
  onShare,
}: PodcastsNewTabProps) {
  return (
    <div
      data-ios-scroll
      className="flex h-full flex-col overflow-y-auto overscroll-contain pb-44 md:pb-32"
    >
      <IosNavigationBar title={messages.New} />
      {!hasFollowedShows ? (
        <IosContentUnavailable
          icon={<SquareGridFillIcon />}
          title={messages.New}
          description={messages["New episodes from shows you follow will appear here."]}
        />
      ) : items.length > 0 ? (
        <div
          aria-busy={isLoading}
          className={isLoading ? "opacity-60 transition-opacity" : "transition-opacity"}
        >
          <EpisodeList
            items={items}
            label={messages.New}
            getHref={getEpisodeHref}
            locale={locale}
            messages={messages}
            now={now}
            showsPodcastTitle
            onGoToShow={onGoToShow}
            onOpen={onOpenEpisode}
            onShare={onShare}
          />
        </div>
      ) : (
        <IosContentUnavailable
          icon={<SquareGridFillIcon />}
          title={messages.New}
          description={
            isLoading
              ? messages["Loading episodes"]
              : messages["New episodes from shows you follow will appear here."]
          }
        />
      )}
    </div>
  );
}
