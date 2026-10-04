"use client";

import { BookmarkIcon } from "@workspace/icons/bookmark-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { GoBackwardIcon } from "@workspace/icons/go-backward-icon";
import { SquareStackFillIcon } from "@workspace/icons/square-stack-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { PodcastQueueItem } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosListRow } from "../../../components/ios/ios-list-row";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosScreen } from "../../../components/ios/ios-screen";
import { useIsHydrated } from "../../../components/use-is-hydrated";
import { EpisodeList } from "./episode-list";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { clearEpisodeProgress, usePodcastLibrary } from "./podcast-library-store";
import { getLibraryViewHref, getTabHref, type LibraryView } from "./podcast-route";
import { PodcastTile } from "./podcast-tile";
import { usePodcasts } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastsLibraryScreenProps {
  view: LibraryView | null;
}

const gridSizes = "(min-width: 1280px) 200px, (min-width: 768px) 25vw, 45vw";

export function PodcastsLibraryScreen({ view }: PodcastsLibraryScreenProps) {
  const { messages } = usePodcasts();
  const iosRouter = useIosRouter();
  const isHydrated = useIsHydrated();
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
            <PodcastTile podcast={podcast} sizes={gridSizes} />
          </li>
        );
      })}
    </ul>
  );

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar
        title={viewTitle}
        titleDisplay={view ? "inline" : "large"}
        leading={
          view ? (
            <IosBarButton
              aria-label={`${messages.Back}: ${messages.Library}`}
              onClick={function returnToLibrary() {
                iosRouter.back(getTabHref("library"));
              }}
            >
              <ChevronLeftIcon strokeWidth={2.6} />
            </IosBarButton>
          ) : (
            <IosAppSwitcherButton />
          )
        }
      />
      {/* The library lives in this browser, so the server renders a placeholder for it. */}
      {!isHydrated ? (
        <EpisodeListSkeleton label={viewTitle} />
      ) : view === null ? (
        <div className="flex flex-col gap-6 pt-1">
          <ul className="border-ios-separator m-0 mx-4 list-none border-y-[0.5px] p-0 md:mx-6">
            <IosListRow
              icon={<SquareStackFillIcon />}
              label={messages.Shows}
              detail={library.followed.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              href={getLibraryViewHref("shows")}
            />
            <IosListRow
              icon={<BookmarkIcon />}
              label={messages.Saved}
              detail={library.saved.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              href={getLibraryViewHref("saved")}
            />
            <IosListRow
              icon={<GoBackwardIcon />}
              label={messages["Recently Played"]}
              detail={recentItems.length}
              className="pl-0 active:bg-transparent active:opacity-60"
              href={getLibraryViewHref("recent")}
            />
          </ul>
          <section aria-label={messages["Recently Updated"]} className="flex flex-col gap-3">
            <Text as="h2" className="text-ios-title2 text-ios-label px-4 font-bold">
              {messages["Recently Updated"]}
            </Text>
            {library.followed.length > 0 ? (
              showsGrid
            ) : (
              <Text className="text-ios-subheadline text-ios-secondary-label px-4">
                {messages["Follow shows to see them here."]}
              </Text>
            )}
          </section>
          <Text className="text-ios-footnote text-ios-secondary-label px-4">
            {messages["Your library stays on this device."]}
          </Text>
        </div>
      ) : view === "shows" ? (
        library.followed.length > 0 ? (
          <div className="pt-2">{showsGrid}</div>
        ) : (
          <IosContentUnavailable
            icon={<SquareStackFillIcon />}
            title={messages.Shows}
            description={messages["Follow shows to see them here."]}
          />
        )
      ) : view === "saved" ? (
        library.saved.length > 0 ? (
          <EpisodeList items={library.saved} label={messages.Saved} showsPodcastTitle />
        ) : (
          <IosContentUnavailable
            icon={<BookmarkIcon />}
            title={messages.Saved}
            description={messages["Save episodes to listen to them later."]}
          />
        )
      ) : recentItems.length > 0 ? (
        <EpisodeList
          items={recentItems}
          label={messages["Recently Played"]}
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
          showsPodcastTitle
        />
      ) : (
        <IosContentUnavailable
          icon={<GoBackwardIcon />}
          title={messages["Recently Played"]}
          description={messages["Episodes you play will appear here."]}
        />
      )}
    </IosScreen>
  );
}
