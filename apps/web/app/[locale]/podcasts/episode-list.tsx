"use client";

import type { IosMenuAction } from "../../../components/ios/ios-menu";
import type { PodcastMessages, PodcastQueueItem } from "./types";

import { EpisodeRow } from "./episode-row";
import { usePodcastLibrary } from "./podcast-library-store";
import { usePodcastPlayer } from "./podcast-player-store";

interface EpisodeListProps {
  getExtraActions?: (item: PodcastQueueItem) => readonly IosMenuAction[];
  getHref: (item: PodcastQueueItem) => string;
  items: readonly PodcastQueueItem[];
  label: string;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onGoToShow?: (item: PodcastQueueItem) => void;
  onOpen: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  showsPodcastTitle?: boolean;
}

export function EpisodeList({
  getExtraActions,
  getHref,
  items,
  label,
  locale,
  messages,
  now,
  onGoToShow,
  onOpen,
  onShare,
  showsPodcastTitle = false,
}: EpisodeListProps) {
  const library = usePodcastLibrary();
  const player = usePodcastPlayer();
  const progressByEpisodeId = new Map(
    library.progress.map(function indexProgress(item) {
      return [item.episode.id, item];
    }),
  );

  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col p-0 pl-4">
      {items.map(function renderEpisode(item) {
        const isCurrent = player.current?.episode.id === item.episode.id;
        return (
          <EpisodeRow
            key={item.episode.id}
            item={item}
            href={getHref(item)}
            isCurrent={isCurrent}
            isPlaying={isCurrent && player.isPlaying}
            isPlayed={library.playedEpisodeIds.has(item.episode.id)}
            progress={progressByEpisodeId.get(item.episode.id)}
            extraActions={getExtraActions?.(item)}
            locale={locale}
            messages={messages}
            now={now}
            showsPodcastTitle={showsPodcastTitle}
            onGoToShow={onGoToShow}
            onOpen={onOpen}
            onShare={onShare}
          />
        );
      })}
    </ul>
  );
}
