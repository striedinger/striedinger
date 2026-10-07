"use client";

import { Text } from "@workspace/ui/components/text";

import type { Podcast, PodcastQueueItem } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosScreen } from "../../../components/ios/ios-screen";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { useIsHydrated } from "../../../components/use-is-hydrated";
import { FeaturedPodcastCard } from "./featured-podcast-card";
import { PodcastChartRow } from "./podcast-chart-row";
import { usePodcastLibrary } from "./podcast-library-store";
import { removeFromQueue, usePlayingEpisode, usePodcastPlayerItems } from "./podcast-player-store";
import { PodcastShelf } from "./podcast-shelf";
import { PodcastTile } from "./podcast-tile";
import { usePodcasts } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";
import { UpNextCard } from "./up-next-card";

interface PodcastsHomeScreenProps {
  popular: readonly Podcast[];
}

const tileSizes = "(min-width: 768px) 180px, 150px";

export function PodcastsHomeScreen({ popular }: PodcastsHomeScreenProps) {
  const { messages } = usePodcasts();
  const isHydrated = useIsHydrated();
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
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar title={messages.Home} leading={<IosAppSwitcherButton />} />
      <div className="flex flex-col gap-7 pt-1">
        {/* Listening history lives in this browser, so the server renders a placeholder for it. */}
        {!isHydrated ? (
          <div aria-hidden="true" className="flex gap-3 overflow-hidden px-4">
            <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
            <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
          </div>
        ) : isNewListener && popular.length > 0 ? (
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
        {popular.length > 0 ? (
          <section aria-label={messages["Top Shows"]} className="flex flex-col">
            <Text as="h2" className="px-4 pb-1 text-ios-title2 font-bold text-ios-label">
              {messages["Top Shows"]}
            </Text>
            <ol className="m-0 grid list-none grid-cols-1 p-0 pl-4 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
              {popular.map(function renderChartRow(podcast, index) {
                return (
                  <PodcastChartRow
                    key={podcast.id}
                    podcast={podcast}
                    rank={index + 1}
                    detail={podcast.genre || podcast.author}
                  />
                );
              })}
            </ol>
          </section>
        ) : null}
        <Text className="px-4 text-ios-footnote text-ios-secondary-label">
          {
            messages[
              "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher."
            ]
          }
        </Text>
      </div>
    </IosScreen>
  );
}
