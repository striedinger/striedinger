"use client";

import type { IosMenuAction } from "../../../components/ios/ios-menu";
import type { PodcastQueueItem } from "./types";

import { EpisodeRow } from "./episode-row";
import { usePodcastLibrary } from "./podcast-library-store";
import { usePlayingEpisode } from "./podcast-player-store";

interface EpisodeListProps {
  getExtraActions?: (item: PodcastQueueItem) => readonly IosMenuAction[];
  items: readonly PodcastQueueItem[];
  label: string;
  showsGoToShow?: boolean;
  showsPodcastTitle?: boolean;
}

export function EpisodeList({
  getExtraActions,
  items,
  label,
  showsGoToShow,
  showsPodcastTitle = false,
}: EpisodeListProps) {
  const library = usePodcastLibrary();
  const { currentEpisodeId, isPlaying } = usePlayingEpisode();
  const progressByEpisodeId = new Map(
    library.progress.map(function indexProgress(item) {
      return [item.episode.id, item];
    }),
  );

  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col p-0 pl-4">
      {items.map(function renderEpisode(item) {
        const isCurrent = currentEpisodeId === item.episode.id;
        return (
          <EpisodeRow
            key={item.episode.id}
            item={item}
            isCurrent={isCurrent}
            isPlaying={isCurrent && isPlaying}
            isPlayed={library.playedEpisodeIds.has(item.episode.id)}
            progress={progressByEpisodeId.get(item.episode.id)}
            extraActions={getExtraActions?.(item)}
            showsGoToShow={showsGoToShow}
            showsPodcastTitle={showsPodcastTitle}
          />
        );
      })}
    </ul>
  );
}
