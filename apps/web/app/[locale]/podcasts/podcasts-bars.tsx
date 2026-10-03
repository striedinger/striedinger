"use client";

import { useSearchParams, useSelectedLayoutSegments } from "next/navigation";
import { useEffect, useState } from "react";

import type { PodcastMessages, PodcastTab } from "./types";

import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { useFollowedPodcasts } from "./podcast-library-store";
import { PodcastMiniPlayer } from "./podcast-mini-player";
import { usePodcastPlayerItems } from "./podcast-player-store";
import {
  getLibraryViewHref,
  getNewEpisodesHref,
  getSearchHref,
  getTabHref,
  normalizeFollowedIds,
  normalizeSearchQuery,
  parsePodcastSegments,
  type PodcastRoute,
} from "./podcast-route";
import { PodcastsTabBar } from "./podcasts-tab-bar";

interface PodcastsBarsProps {
  isTabBarMinimized: boolean;
  messages: PodcastMessages;
  onOpenNowPlaying: () => void;
  onSearchInputChange: (value: string) => void;
  /** Reports the query in the URL while the Search tab shows, so the field can follow it. */
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onSelectTab: () => void;
  searchInput: string;
}

type TabHrefs = Partial<Record<PodcastTab, string>>;

function createRouteHref(
  segments: readonly string[],
  route: PodcastRoute,
  query: string,
  followedIds: readonly string[],
) {
  // Show and episode paths carry slugs the route does not keep, so they are reused as is.
  if (route.podcastId) return `/podcasts/${segments.join("/")}`;
  if (route.libraryView) return getLibraryViewHref(route.libraryView);
  if (route.tab === "new") return getNewEpisodesHref(followedIds);
  if (route.tab === "search") return getSearchHref(query);
  return getTabHref(route.tab ?? "home");
}

/** Scrolls the visible screen to the top, as tapping the current tab does on iOS. */
function scrollVisibleScreenToTop() {
  const screens = document.querySelectorAll<HTMLElement>(
    '[data-slot="ios-app-frame"] [data-ios-scroll]',
  );
  for (const screen of screens) {
    if (screen.getClientRects().length > 0) screen.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * The tab bar and Now Playing accessory, which follow the current route. Each tab remembers
 * the screen it last showed, so returning to a tab returns to that screen, and tapping the
 * current tab pops to its root or scrolls to the top.
 */
export function PodcastsBars({
  isTabBarMinimized,
  messages,
  onOpenNowPlaying,
  onSearchInputChange,
  onSearchQueryChange,
  onSearchSubmit,
  onSelectTab,
  searchInput,
}: PodcastsBarsProps) {
  const iosRouter = useIosRouter();
  const hasAccessory = usePodcastPlayerItems().current !== null;
  const segments = useSelectedLayoutSegments();
  const route = parsePodcastSegments(segments);
  const query = normalizeSearchQuery(useSearchParams().get("q"));
  const followedIds = normalizeFollowedIds(
    useFollowedPodcasts().map(function selectPodcastId(podcast) {
      return podcast.id;
    }),
  );
  // Shows and episodes belong to the tab that pushed them.
  const [stackTab, setStackTab] = useState<PodcastTab>(route.tab ?? "home");
  const [tabHrefs, setTabHrefs] = useState<TabHrefs>({});
  if (route.tab && route.tab !== stackTab) setStackTab(route.tab);
  const activeTab = route.tab ?? stackTab;
  const routeHref = createRouteHref(segments, route, query, followedIds);
  if (tabHrefs[activeTab] !== routeHref) setTabHrefs({ ...tabHrefs, [activeTab]: routeHref });
  const [previousTab, setPreviousTab] = useState<Exclude<PodcastTab, "search">>(
    activeTab === "search" ? "home" : activeTab,
  );
  if (activeTab !== "search" && activeTab !== previousTab) setPreviousTab(activeTab);
  const isSearching = activeTab === "search";

  useEffect(
    function followSearchQuery() {
      if (isSearching) onSearchQueryChange(query);
    },
    [isSearching, onSearchQueryChange, query],
  );

  function getTabRootHref(tab: PodcastTab) {
    return tab === "new" ? getNewEpisodesHref(followedIds) : getTabHref(tab);
  }

  function selectTab(tab: PodcastTab) {
    onSelectTab();
    if (tab === activeTab) {
      if (route.tab === null || route.libraryView) {
        iosRouter.replace(getTabRootHref(tab), { direction: "back" });
      } else {
        scrollVisibleScreenToTop();
      }
      return;
    }
    const rememberedHref = tabHrefs[tab];
    // The New tab's list depends on which shows are followed now.
    const isRememberedNewList = tab === "new" && rememberedHref?.startsWith(getTabRootHref("new"));
    iosRouter.push(rememberedHref && !isRememberedNewList ? rememberedHref : getTabRootHref(tab), {
      direction: "none",
    });
  }

  return (
    <>
      <PodcastsTabBar
        activeTab={activeTab}
        hasAccessory={hasAccessory}
        isMinimized={isTabBarMinimized && !isSearching}
        previousTab={previousTab}
        messages={messages}
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        onSearchSubmit={onSearchSubmit}
        onSelectTab={selectTab}
      />
      <PodcastMiniPlayer
        isTabBarMinimized={isTabBarMinimized && !isSearching}
        messages={messages}
        onOpen={onOpenNowPlaying}
      />
    </>
  );
}
