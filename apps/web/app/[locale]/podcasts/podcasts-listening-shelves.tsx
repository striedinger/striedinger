"use client";

import { use } from "react";
import { browser } from "react-dom";

import type { Podcast, PodcastQueueItem } from "./types";

import { FeaturedPodcastCard } from "./featured-podcast-card";
import { usePodcastLibrary } from "./podcast-library-store";
import { removeFromQueue, usePlayingEpisode, usePodcastPlayerItems } from "./podcast-player-store";
import { PodcastShelf } from "./podcast-shelf";
import { PodcastTile } from "./podcast-tile";
import { usePodcasts } from "./podcasts-context";
import { UpNextCard } from "./up-next-card";

interface PodcastsListeningShelvesProps {
  popular: readonly Podcast[];
}

const tileSizes = "(min-width: 768px) 180px, 150px";

/**
 * The shelves built from listening history and followed shows. They live in this browser, so
 * the server leaves them to the browser, which renders them with the stored library on its
 * first pass instead of hydrating an empty one and rendering again.
 */
export function PodcastsListeningShelves({ popular }: PodcastsListeningShelvesProps) {
  use(browser("Listening history is stored in the browser."));
  const { messages } = usePodcasts();
  const library = usePodcastLibrary();
  const player = usePodcastPlayerItems();
  const playingEpisode = usePlayingEpisode();
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
    <>
      {isNewListener && popular.length > 0 ? (
        <ul
          aria-label={messages["Top Shows"]}
          className="m-0 flex snap-x snap-mandatory scroll-px-4 scrollbar-none list-none gap-3 overflow-x-auto overscroll-x-contain px-4 [&::-webkit-scrollbar]:hidden"
        >
          {popular.slice(0, 5).map(function renderFeatured(podcast, index) {
            return (
              <FeaturedPodcastCard key={podcast.id} podcast={podcast} priority={index === 0} />
            );
          })}
        </ul>
      ) : null}
      {upNextItems.length > 0 ? (
        <PodcastShelf title={messages["Up Next"]}>
          {upNextItems.map(function renderUpNext(item) {
            const isCurrent = playingEpisode.currentEpisodeId === item.episode.id;
            return (
              <UpNextCard
                key={item.episode.id}
                item={item}
                isCurrent={isCurrent}
                isPlaying={isCurrent && playingEpisode.isPlaying}
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
              />
            );
          })}
        </PodcastShelf>
      ) : null}
      {library.followed.length > 0 ? (
        <PodcastShelf title={messages["Your Shows"]}>
          {library.followed.map(function renderFollowedShow(podcast) {
            return (
              <li key={podcast.id} className="w-37.5 shrink-0 snap-start md:w-45">
                <PodcastTile podcast={podcast} sizes={tileSizes} />
              </li>
            );
          })}
        </PodcastShelf>
      ) : null}
    </>
  );
}
