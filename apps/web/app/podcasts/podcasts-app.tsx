"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type {
  Podcast,
  PodcastEpisode,
  PodcastMessages,
  PodcastQueueItem,
  PodcastShow,
  PodcastTab,
} from "./types";

import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import {
  runIosStackTransition,
  type IosStackDirection,
} from "../../components/ios/ios-stack-transition";
import { copyText } from "../../lib/copy-text";
import { NowPlayingSheet } from "./now-playing-sheet";
import { PodcastEpisodePage } from "./podcast-episode-page";
import { usePodcastLibrary } from "./podcast-library-store";
import { PodcastMiniPlayer } from "./podcast-mini-player";
import { pausePlayback, usePodcastPlayer } from "./podcast-player-store";
import {
  createPodcastHref,
  createTabRoute,
  getPodcastRouteKey,
  normalizeFollowedIds,
  parsePodcastRoute,
  type LibraryView,
  type PodcastRoute,
} from "./podcast-route";
import { PodcastShowPage } from "./podcast-show-page";
import { PodcastsHomeTab } from "./podcasts-home-tab";
import { PodcastsLibraryTab } from "./podcasts-library-tab";
import { PodcastsNewTab } from "./podcasts-new-tab";
import { PodcastsSearchTab } from "./podcasts-search-tab";
import { PodcastsTabBar } from "./podcasts-tab-bar";
import { useSearchInput } from "./use-search-input";

interface PodcastsAppProps {
  locale: string;
  messages: PodcastMessages;
  popular: readonly Podcast[];
  searchFailed: boolean;
  searchQuery: string;
  searchResults: readonly Podcast[];
  newEpisodes: readonly PodcastQueueItem[];
  newEpisodesShowIds: readonly string[];
  show: PodcastShow | null;
}

interface OptimisticRoute {
  fromKey: string;
  route: PodcastRoute;
}

const stackTransitionName = "ios-podcasts-stack";
const tabOrder: readonly PodcastTab[] = ["home", "new", "library", "search"];

export function PodcastsApp({
  locale,
  messages,
  popular,
  searchFailed,
  searchQuery,
  searchResults,
  newEpisodes,
  newEpisodesShowIds,
  show,
}: PodcastsAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRoute = parsePodcastRoute(searchParams);
  const urlRouteKey = getPodcastRouteKey(urlRoute);
  const [optimisticRoute, setOptimisticRoute] = useState<OptimisticRoute | null>(null);
  if (
    optimisticRoute &&
    optimisticRoute.fromKey !== urlRouteKey &&
    getPodcastRouteKey(optimisticRoute.route) === urlRouteKey
  ) {
    setOptimisticRoute(null);
  }
  const route = optimisticRoute?.fromKey === urlRouteKey ? optimisticRoute.route : urlRoute;
  const [isNavigating, startNavigation] = useTransition();
  const [openedItem, setOpenedItem] = useState<PodcastQueueItem | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<PodcastTab>>(
    function createVisitedTabs() {
      return new Set([urlRoute.tab]);
    },
  );
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [previousTab, setPreviousTab] = useState<Exclude<PodcastTab, "search">>(
    urlRoute.tab === "search" ? "home" : urlRoute.tab,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [now] = useState(function readCurrentTime() {
    return Date.now();
  });
  const routeStackRef = useRef<PodcastRoute[]>([]);
  const isLeavingByBackRef = useRef(false);
  const tabScrollRefs = useRef(new Map<PodcastTab, HTMLDivElement>());
  const library = usePodcastLibrary();
  const player = usePodcastPlayer();
  const followedShowIds = normalizeFollowedIds(
    library.followed.map(function selectPodcastId(podcast) {
      return podcast.id;
    }),
  );

  useEffect(function trackBrowserHistory() {
    function forgetHistoryEntry() {
      if (isLeavingByBackRef.current) {
        isLeavingByBackRef.current = false;
        return;
      }
      routeStackRef.current.pop();
    }
    window.addEventListener("popstate", forgetHistoryEntry);
    return function stopTrackingBrowserHistory() {
      window.removeEventListener("popstate", forgetHistoryEntry);
    };
  }, []);

  const followedShowKey = followedShowIds.join(",");
  const newEpisodesShowKey = newEpisodesShowIds.join(",");
  const isNewTabActive = route.tab === "new" && route.podcastId === null;

  useEffect(
    function loadNewEpisodesForFollowedShows() {
      if (!isNewTabActive || followedShowKey === newEpisodesShowKey) return;
      const nextRoute = {
        ...createTabRoute("new"),
        followedIds: followedShowKey ? followedShowKey.split(",") : [],
      };
      startNavigation(function refreshNewEpisodes() {
        router.replace(createPodcastHref(pathname, nextRoute), { scroll: false });
      });
    },
    [followedShowKey, isNewTabActive, newEpisodesShowKey, pathname, router],
  );

  useEffect(function pauseWhenLeavingPodcasts() {
    return pausePlayback;
  }, []);

  useEffect(
    function clearStatusMessage() {
      if (!statusMessage) return;
      const timeout = window.setTimeout(function hideStatusMessage() {
        setStatusMessage("");
      }, 1_600);
      return function cancelStatusMessage() {
        window.clearTimeout(timeout);
      };
    },
    [statusMessage],
  );

  const knownPodcasts = new Map<string, Podcast>();
  const knownItems = new Map<string, PodcastQueueItem>();
  function rememberItem(item: { episode: PodcastEpisode; podcast: Podcast }) {
    knownPodcasts.set(item.podcast.id, item.podcast);
    knownItems.set(item.episode.id, { podcast: item.podcast, episode: item.episode });
  }
  for (const podcast of [...popular, ...searchResults, ...library.followed])
    knownPodcasts.set(podcast.id, podcast);
  for (const item of [...library.progress, ...library.saved, ...player.queue]) rememberItem(item);
  if (player.current) rememberItem(player.current);
  if (openedItem) rememberItem(openedItem);
  if (show) {
    knownPodcasts.set(show.podcast.id, show.podcast);
    for (const episode of show.episodes) rememberItem({ podcast: show.podcast, episode });
  }

  const serverShow = show && show.podcast.id === route.podcastId ? show : null;
  const routePodcast = route.podcastId
    ? (serverShow?.podcast ?? knownPodcasts.get(route.podcastId) ?? null)
    : null;
  const routeItem = route.episodeId ? (knownItems.get(route.episodeId) ?? null) : null;
  const isStackOpen = route.podcastId !== null;
  const mountedTabs = new Set([...visitedTabs, route.tab]);
  const tabTitles: Record<PodcastTab, string> = {
    home: messages.Home,
    new: messages.New,
    library: messages.Library,
    search: messages.Search,
  };

  function getShowHref(podcast: Podcast) {
    return createPodcastHref(pathname, { ...route, podcastId: podcast.id, episodeId: null });
  }

  function getEpisodeHref(item: PodcastQueueItem) {
    return createPodcastHref(pathname, {
      ...route,
      podcastId: item.podcast.id,
      episodeId: item.episode.id,
    });
  }

  function navigate(nextRoute: PodcastRoute, direction: IosStackDirection) {
    const href = createPodcastHref(pathname, nextRoute);
    const needsServerData =
      nextRoute.podcastId !== null && nextRoute.podcastId !== show?.podcast.id;
    const fromKey = urlRouteKey;
    runIosStackTransition({
      commit: function showNextRoute() {
        setOptimisticRoute({ fromKey, route: nextRoute });
      },
      direction,
      narrowScreensOnly: false,
      transitionName: stackTransitionName,
    });
    routeStackRef.current.push(route);
    if (needsServerData) {
      startNavigation(function loadNextRoute() {
        router.push(href, { scroll: false });
      });
    } else {
      window.history.pushState(null, "", href);
    }
  }

  function goBack(fallbackRoute: PodcastRoute) {
    const previousRoute = routeStackRef.current.pop();
    const parentRoute = previousRoute ?? fallbackRoute;
    const fromKey = urlRouteKey;
    runIosStackTransition({
      commit: function showParentRoute() {
        setOptimisticRoute({ fromKey, route: parentRoute });
      },
      direction: "back",
      narrowScreensOnly: false,
      transitionName: stackTransitionName,
    });
    if (previousRoute) {
      isLeavingByBackRef.current = true;
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", createPodcastHref(pathname, parentRoute));
  }

  function openShow(podcast: Podcast) {
    navigate({ ...route, podcastId: podcast.id, episodeId: null }, "forward");
  }

  function openEpisode(item: PodcastQueueItem) {
    setOpenedItem(item);
    navigate({ ...route, podcastId: item.podcast.id, episodeId: item.episode.id }, "forward");
  }

  function goToShow(item: PodcastQueueItem) {
    setIsNowPlayingOpen(false);
    if (route.podcastId === item.podcast.id && route.episodeId === null) return;
    navigate({ ...route, podcastId: item.podcast.id, episodeId: null }, "forward");
  }

  function openLibraryView(view: LibraryView) {
    navigate({ ...createTabRoute("library"), libraryView: view }, "forward");
  }

  function selectTab(tab: PodcastTab) {
    if (tab === route.tab) {
      if (route.podcastId || route.libraryView) {
        goBack({ ...createTabRoute(tab), query: route.query });
        return;
      }
      tabScrollRefs.current
        .get(tab)
        ?.querySelector("[data-ios-scroll]")
        ?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const nextRoute =
      tab === "new"
        ? { ...createTabRoute("new"), followedIds: followedShowIds }
        : createTabRoute(tab);
    setVisitedTabs(new Set([...visitedTabs, tab]));
    if (tab !== "search") setPreviousTab(tab);
    setOptimisticRoute({ fromKey: urlRouteKey, route: nextRoute });
    routeStackRef.current = [];
    const href = createPodcastHref(pathname, nextRoute);
    if (tab === "new" && followedShowIds.join(",") !== newEpisodesShowIds.join(",")) {
      startNavigation(function loadNewEpisodes() {
        router.replace(href, { scroll: false });
      });
      return;
    }
    window.history.replaceState(null, "", href);
  }

  function search(query: string) {
    const nextRoute = { ...createTabRoute("search"), query };
    startNavigation(function loadSearchResults() {
      router.replace(createPodcastHref(pathname, nextRoute), { scroll: false });
    });
  }

  const searchInput = useSearchInput(searchQuery, search);

  async function shareLink(title: string, href: string) {
    const url = new URL(href, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (await copyText(url)) setStatusMessage(messages["Copied to Clipboard"]);
  }

  function shareEpisode(item: PodcastQueueItem) {
    void shareLink(
      item.episode.title,
      createPodcastHref(pathname, {
        ...createTabRoute("home"),
        podcastId: item.podcast.id,
        episodeId: item.episode.id,
      }),
    );
  }

  function shareShow(podcast: Podcast) {
    void shareLink(
      podcast.title,
      createPodcastHref(pathname, { ...createTabRoute("home"), podcastId: podcast.id }),
    );
  }

  function renderTab(tab: PodcastTab) {
    if (tab === "home") {
      return (
        <PodcastsHomeTab
          popular={popular}
          getEpisodeHref={getEpisodeHref}
          getShowHref={getShowHref}
          locale={locale}
          messages={messages}
          now={now}
          onGoToShow={goToShow}
          onOpenEpisode={openEpisode}
          onOpenShow={openShow}
          onShare={shareEpisode}
        />
      );
    }
    if (tab === "new") {
      return (
        <PodcastsNewTab
          items={newEpisodesShowIds.join(",") === followedShowIds.join(",") ? newEpisodes : []}
          hasFollowedShows={followedShowIds.length > 0}
          isLoading={isNavigating && route.tab === "new"}
          getEpisodeHref={getEpisodeHref}
          locale={locale}
          messages={messages}
          now={now}
          onGoToShow={goToShow}
          onOpenEpisode={openEpisode}
          onShare={shareEpisode}
        />
      );
    }
    if (tab === "library") {
      return (
        <PodcastsLibraryTab
          view={route.tab === "library" ? route.libraryView : null}
          getEpisodeHref={getEpisodeHref}
          getShowHref={getShowHref}
          locale={locale}
          messages={messages}
          now={now}
          onBack={function closeLibraryView() {
            goBack(createTabRoute("library"));
          }}
          onGoToShow={goToShow}
          onOpenEpisode={openEpisode}
          onOpenShow={openShow}
          onOpenView={openLibraryView}
          onShare={shareEpisode}
        />
      );
    }
    return (
      <PodcastsSearchTab
        query={searchQuery}
        inputValue={searchInput.value}
        results={searchResults}
        searchFailed={searchFailed}
        isSearching={isNavigating && route.tab === "search" && !isStackOpen}
        getShowHref={getShowHref}
        messages={messages}
        onOpenShow={openShow}
        onSearchCategory={searchInput.searchNow}
      />
    );
  }

  function renderStackPage() {
    const parentLabel = route.libraryView ? messages.Library : tabTitles[route.tab];
    if (route.episodeId && routeItem) {
      return (
        <PodcastEpisodePage
          key={routeItem.episode.id}
          item={routeItem}
          showHref={getShowHref(routeItem.podcast)}
          locale={locale}
          messages={messages}
          now={now}
          onBack={function closeEpisode() {
            goBack({ ...route, episodeId: null });
          }}
          onGoToShow={goToShow}
          onShare={shareEpisode}
        />
      );
    }
    if (routePodcast) {
      return (
        <PodcastShowPage
          key={routePodcast.id}
          podcast={routePodcast}
          episodes={serverShow?.episodes ?? null}
          isLoading={
            serverShow === null && (isNavigating || route.podcastId !== urlRoute.podcastId)
          }
          backLabel={parentLabel}
          getEpisodeHref={getEpisodeHref}
          locale={locale}
          messages={messages}
          now={now}
          onBack={function closeShow() {
            goBack({ ...route, podcastId: null, episodeId: null });
          }}
          onOpenEpisode={openEpisode}
          onShare={shareEpisode}
          onShareShow={shareShow}
        />
      );
    }
    return (
      <div data-ios-scroll className="flex h-full flex-col overflow-y-auto">
        <IosNavigationBar title={messages.Episodes} titleDisplay="hidden" />
        <Text className="px-8 pt-[20vh] text-center text-[17px] text-(--ios-secondary-label)">
          {isNavigating
            ? messages["Loading episodes"]
            : messages["Episodes are unavailable right now. Please try another show."]}
        </Text>
      </div>
    );
  }

  return (
    <Drawer.Provider>
      <Drawer.IndentBackground className="absolute inset-0 bg-black" />
      <Drawer.Indent className="relative flex size-full origin-[center_top] flex-col overflow-hidden bg-(--ios-background) transition-[transform,border-radius] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform data-active:scale-[0.94] data-active:rounded-[12px] motion-reduce:transition-none md:flex-row md:data-active:scale-[0.97]">
        <PodcastsTabBar
          activeTab={route.tab}
          previousTab={previousTab}
          messages={messages}
          searchInput={searchInput.value}
          onSearchInputChange={searchInput.updateValue}
          onSearchSubmit={function submitSearch() {
            searchInput.searchNow(searchInput.value);
          }}
          onSelectTab={selectTab}
        />
        <div className="relative min-h-0 min-w-0 flex-1">
          <div
            style={{ viewTransitionName: stackTransitionName }}
            className="absolute inset-0 overflow-hidden bg-(--ios-background)"
          >
            {tabOrder.map(function renderMountedTab(tab) {
              if (!mountedTabs.has(tab)) return null;
              const isVisible = tab === route.tab && !isStackOpen;
              return (
                <div
                  key={tab}
                  ref={function registerTabScroller(element) {
                    if (element) tabScrollRefs.current.set(tab, element);
                    else tabScrollRefs.current.delete(tab);
                  }}
                  inert={!isVisible}
                  className={cn(
                    "absolute inset-0",
                    !isVisible && "invisible [content-visibility:hidden]",
                  )}
                >
                  {renderTab(tab)}
                </div>
              );
            })}
            {isStackOpen ? (
              <div className="absolute inset-0 z-10 bg-(--ios-background)">{renderStackPage()}</div>
            ) : null}
          </div>
          <PodcastMiniPlayer
            messages={messages}
            onOpen={function openNowPlaying() {
              setIsNowPlayingOpen(true);
            }}
          />
        </div>
      </Drawer.Indent>
      <NowPlayingSheet
        open={isNowPlayingOpen}
        onOpenChange={setIsNowPlayingOpen}
        locale={locale}
        messages={messages}
        now={now}
        onGoToShow={goToShow}
        onShare={shareEpisode}
      />
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute top-1/3 left-1/2 z-50 -translate-x-1/2 rounded-[14px] bg-(--ios-menu) px-5 py-3 text-[15px] font-semibold text-(--ios-label) shadow-[0_10px_40px_rgb(0_0_0/0.18)] backdrop-blur-2xl transition-opacity duration-200 motion-reduce:transition-none",
          statusMessage ? "opacity-100" : "opacity-0",
        )}
      >
        {statusMessage}
      </div>
    </Drawer.Provider>
  );
}
