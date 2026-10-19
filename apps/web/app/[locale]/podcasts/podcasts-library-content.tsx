"use client";

import { BookmarkIcon } from "@workspace/icons/bookmark-icon";
import { GoBackwardIcon } from "@workspace/icons/go-backward-icon";
import { SquareStackFillIcon } from "@workspace/icons/square-stack-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { use } from "react";
import { browser } from "react-dom";

import type { PodcastQueueItem } from "./types";

import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosListRow } from "../../../components/ios/ios-list-row";
import { EpisodeList } from "./episode-list";
import { clearEpisodeProgress, usePodcastLibrary } from "./podcast-library-store";
import { getLibraryViewHref, type LibraryView } from "./podcast-route";
import { PodcastTile } from "./podcast-tile";
import { usePodcasts } from "./podcasts-context";

interface PodcastsLibraryContentProps {
  view: LibraryView | null;
}

const gridSizes = "(min-width: 1280px) 200px, (min-width: 768px) 25vw, 45vw";

/**
 * The library's shows, saved episodes, and history. They live in this browser, so the server
 * leaves them to the browser, which renders them with the stored library on its first pass.
 */
export function PodcastsLibraryContent({ view }: PodcastsLibraryContentProps) {
  use(browser("The podcast library is stored in the browser."));
  const { messages } = usePodcasts();
  const library = usePodcastLibrary();
  const recentItems: PodcastQueueItem[] = library.progress.map(function createItem(item) {
    return { podcast: item.podcast, episode: item.episode };
  });
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

  return view === null ? (
    <div className="flex flex-col gap-6 pt-1">
      <ul className="m-0 mx-4 list-none border-y-[0.5px] border-ios-separator p-0 md:mx-6">
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
        <Text as="h2" className="px-4 text-ios-title2 font-bold text-ios-label">
          {messages["Recently Updated"]}
        </Text>
        {library.followed.length > 0 ? (
          showsGrid
        ) : (
          <Text className="px-4 text-ios-subheadline text-ios-secondary-label">
            {messages["Follow shows to see them here."]}
          </Text>
        )}
      </section>
      <Text className="px-4 text-ios-footnote text-ios-secondary-label">
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
  );
}
