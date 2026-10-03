"use client";

import { BookmarkIcon } from "@workspace/icons/bookmark-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { GoBackwardIcon } from "@workspace/icons/go-backward-icon";
import { SquareStackFillIcon } from "@workspace/icons/square-stack-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { LibraryView } from "./podcast-route";
import type { Podcast, PodcastMessages, PodcastQueueItem } from "./types";

import { IosBarButton } from "../../components/ios/ios-bar-button";
import { IosListRow } from "../../components/ios/ios-list-row";
import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { EpisodeList } from "./episode-list";
import { LibraryEmptyMessage } from "./library-empty-message";
import { clearEpisodeProgress, usePodcastLibrary } from "./podcast-library-store";
import { PodcastTile } from "./podcast-tile";

interface PodcastsLibraryTabProps {
  getEpisodeHref: (item: PodcastQueueItem) => string;
  getShowHref: (podcast: Podcast) => string;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onBack: () => void;
  onGoToShow: (item: PodcastQueueItem) => void;
  onOpenEpisode: (item: PodcastQueueItem) => void;
  onOpenShow: (podcast: Podcast) => void;
  onOpenView: (view: LibraryView) => void;
  onShare: (item: PodcastQueueItem) => void;
  view: LibraryView | null;
}

const gridSizes = "(min-width: 1280px) 200px, (min-width: 768px) 25vw, 45vw";

export function PodcastsLibraryTab({
  getEpisodeHref,
  getShowHref,
  locale,
  messages,
  now,
  onBack,
  onGoToShow,
  onOpenEpisode,
  onOpenShow,
  onOpenView,
  onShare,
  view,
}: PodcastsLibraryTabProps) {
  const library = usePodcastLibrary();
  const recentItems: PodcastQueueItem[] = library.progress.map(function createItem(item) {
    return { podcast: item.podcast, episode: item.episode };
  });
  const viewTitle =
    view === "shows"
      ? messages.Shows
      : view === "saved"
        ? messages.Saved
        : view === "recent"
          ? messages["Recently Played"]
          : messages.Library;
  const showsGrid = (
    <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-5 p-0 px-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {library.followed.map(function renderShow(podcast) {
        return (
          <li key={podcast.id} className="min-w-0">
            <PodcastTile
              podcast={podcast}
              href={getShowHref(podcast)}
              sizes={gridSizes}
              onOpen={onOpenShow}
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      data-ios-scroll
      className="flex h-full flex-col overflow-y-auto overscroll-contain pb-44 md:pb-32"
    >
      <IosNavigationBar
        title={viewTitle}
        leading={
          view ? (
            <IosBarButton className="-ml-1 gap-0.5 px-1" onClick={onBack}>
              <ChevronLeftIcon className="!size-[24px]" strokeWidth={2.6} />
              {messages.Library}
            </IosBarButton>
          ) : null
        }
      />
      {view === null ? (
        <div className="flex flex-col gap-6 pt-1">
          <ul className="m-0 mx-4 list-none border-y-[0.5px] border-(--ios-separator) p-0 md:mx-6">
            <IosListRow
              icon={<SquareStackFillIcon />}
              label={messages.Shows}
              detail={library.followed.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              onClick={function openShows() {
                onOpenView("shows");
              }}
            />
            <IosListRow
              icon={<BookmarkIcon />}
              label={messages.Saved}
              detail={library.saved.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              onClick={function openSaved() {
                onOpenView("saved");
              }}
            />
            <IosListRow
              icon={<GoBackwardIcon />}
              label={messages["Recently Played"]}
              detail={recentItems.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              onClick={function openRecent() {
                onOpenView("recent");
              }}
            />
          </ul>
          <section aria-label={messages["Recently Updated"]} className="flex flex-col gap-3">
            <Text
              as="h2"
              className="px-4 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
            >
              {messages["Recently Updated"]}
            </Text>
            {library.followed.length > 0 ? (
              showsGrid
            ) : (
              <Text className="px-4 text-[15px] leading-5 text-(--ios-secondary-label)">
                {messages["Follow shows to see them here."]}
              </Text>
            )}
          </section>
          <Text className="px-4 text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {messages["Your library stays on this device."]}
          </Text>
        </div>
      ) : view === "shows" ? (
        library.followed.length > 0 ? (
          <div className="pt-2">{showsGrid}</div>
        ) : (
          <LibraryEmptyMessage message={messages["Follow shows to see them here."]} />
        )
      ) : view === "saved" ? (
        library.saved.length > 0 ? (
          <EpisodeList
            items={library.saved}
            label={messages.Saved}
            getHref={getEpisodeHref}
            locale={locale}
            messages={messages}
            now={now}
            showsPodcastTitle
            onGoToShow={onGoToShow}
            onOpen={onOpenEpisode}
            onShare={onShare}
          />
        ) : (
          <LibraryEmptyMessage message={messages["Save episodes to listen to them later."]} />
        )
      ) : recentItems.length > 0 ? (
        <EpisodeList
          items={recentItems}
          label={messages["Recently Played"]}
          getHref={getEpisodeHref}
          getExtraActions={function getRecentActions(item) {
            return [
              {
                id: "remove-recent",
                label: messages["Remove from Recently Played"],
                destructive: true,
                onSelect: function removeRecent() {
                  clearEpisodeProgress(item.episode.id);
                },
              },
            ];
          }}
          locale={locale}
          messages={messages}
          now={now}
          showsPodcastTitle
          onGoToShow={onGoToShow}
          onOpen={onOpenEpisode}
          onShare={onShare}
        />
      ) : (
        <LibraryEmptyMessage message={messages["Episodes you play will appear here."]} />
      )}
    </div>
  );
}
