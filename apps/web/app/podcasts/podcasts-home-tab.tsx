"use client";

import { Text } from "@workspace/ui/components/text";

import type { Podcast, PodcastMessages, PodcastQueueItem } from "./types";

import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { usePodcastLibrary } from "./podcast-library-store";
import { removeFromQueue, usePodcastPlayer } from "./podcast-player-store";
import { PodcastShelf } from "./podcast-shelf";
import { PodcastTile } from "./podcast-tile";
import { UpNextCard } from "./up-next-card";

interface PodcastsHomeTabProps {
  getEpisodeHref: (item: PodcastQueueItem) => string;
  getShowHref: (podcast: Podcast) => string;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onGoToShow: (item: PodcastQueueItem) => void;
  onOpenEpisode: (item: PodcastQueueItem) => void;
  onOpenShow: (podcast: Podcast) => void;
  onShare: (item: PodcastQueueItem) => void;
  popular: readonly Podcast[];
}

const tileSizes = "(min-width: 768px) 180px, 150px";

export function PodcastsHomeTab({
  getEpisodeHref,
  getShowHref,
  locale,
  messages,
  now,
  onGoToShow,
  onOpenEpisode,
  onOpenShow,
  onShare,
  popular,
}: PodcastsHomeTabProps) {
  const library = usePodcastLibrary();
  const player = usePodcastPlayer();
  const progressByEpisodeId = new Map(
    library.progress.map(function indexProgress(item) {
      return [item.episode.id, item];
    }),
  );
  const queuedEpisodeIds = new Set(
    player.queue.map(function selectEpisodeId(item) {
      return item.episode.id;
    }),
  );
  const upNextItems: PodcastQueueItem[] = [];
  const includedEpisodeIds = new Set<string>();
  for (const item of [
    ...(player.current ? [player.current] : []),
    ...player.queue,
    ...library.progress,
  ]) {
    if (includedEpisodeIds.has(item.episode.id) || library.playedEpisodeIds.has(item.episode.id))
      continue;
    includedEpisodeIds.add(item.episode.id);
    upNextItems.push({ podcast: item.podcast, episode: item.episode });
  }
  const isNewListener = upNextItems.length === 0 && library.followed.length === 0;

  return (
    <div
      data-ios-scroll
      className="flex h-full flex-col overflow-y-auto overscroll-contain pb-44 md:pb-32"
    >
      <IosNavigationBar title={messages.Home} />
      <div className="flex flex-col gap-7 pt-1">
        {isNewListener ? (
          <div className="mx-4 flex flex-col gap-1.5 rounded-[14px] bg-(--ios-secondary-background) p-5 md:mx-6">
            <Text as="h2" className="text-[20px] leading-[25px] font-bold text-(--ios-label)">
              {messages["Start listening"]}
            </Text>
            <Text className="text-[15px] leading-5 text-(--ios-secondary-label)">
              {messages["Follow shows you love and pick up episodes right where you left off."]}
            </Text>
          </div>
        ) : null}
        {upNextItems.length > 0 ? (
          <PodcastShelf title={messages["Up Next"]}>
            {upNextItems.map(function renderUpNext(item) {
              const isCurrent = player.current?.episode.id === item.episode.id;
              return (
                <UpNextCard
                  key={item.episode.id}
                  item={item}
                  href={getEpisodeHref(item)}
                  isCurrent={isCurrent}
                  isPlaying={isCurrent && player.isPlaying}
                  progress={progressByEpisodeId.get(item.episode.id)}
                  extraActions={
                    queuedEpisodeIds.has(item.episode.id)
                      ? [
                          {
                            id: "remove-up-next",
                            label: messages["Remove from Up Next"],
                            onSelect: function removeQueuedEpisode() {
                              removeFromQueue(item.episode.id);
                            },
                          },
                        ]
                      : undefined
                  }
                  locale={locale}
                  messages={messages}
                  now={now}
                  onGoToShow={onGoToShow}
                  onOpen={onOpenEpisode}
                  onShare={onShare}
                />
              );
            })}
          </PodcastShelf>
        ) : null}
        {library.followed.length > 0 ? (
          <PodcastShelf title={messages["Your Shows"]}>
            {library.followed.map(function renderFollowedShow(podcast) {
              return (
                <li key={podcast.id} className="w-[150px] shrink-0 snap-start md:w-[180px]">
                  <PodcastTile
                    podcast={podcast}
                    href={getShowHref(podcast)}
                    sizes={tileSizes}
                    onOpen={onOpenShow}
                  />
                </li>
              );
            })}
          </PodcastShelf>
        ) : null}
        {popular.length > 0 ? (
          <PodcastShelf title={messages["Top Shows"]}>
            {popular.map(function renderPopularShow(podcast, index) {
              return (
                <li key={podcast.id} className="w-[150px] shrink-0 snap-start md:w-[180px]">
                  <PodcastTile
                    podcast={podcast}
                    href={getShowHref(podcast)}
                    sizes={tileSizes}
                    priority={index < 3 && isNewListener}
                    onOpen={onOpenShow}
                  />
                </li>
              );
            })}
          </PodcastShelf>
        ) : null}
        <Text className="px-4 text-[13px] leading-[18px] text-(--ios-secondary-label)">
          {
            messages[
              "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher."
            ]
          }
        </Text>
      </div>
    </div>
  );
}
