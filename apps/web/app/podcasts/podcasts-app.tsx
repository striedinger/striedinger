"use client";

import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

import type {
  Podcast,
  PodcastEpisode,
  PodcastMessages,
  PodcastQueueItem,
  PodcastShow,
  PodcastTab,
} from "./types";

import { IosErrorBoundary } from "../../components/ios/ios-error-boundary";
import { IosScreenTransition } from "../../components/ios/ios-screen-transition";
import { IosToast } from "../../components/ios/ios-toast";
import { useHasOpened } from "../../components/ios/use-has-opened";
import { useIosNavigation } from "../../components/ios/use-ios-navigation";
import { copyText } from "../../lib/copy-text";
import { PodcastEpisodePage } from "./podcast-episode-page";
import { useFollowedPodcasts } from "./podcast-library-store";
import { PodcastMiniPlayer } from "./podcast-mini-player";
import { pausePlayback, usePodcastPlayerItems } from "./podcast-player-store";
import {
  createPodcastHref,
  createTabRoute,
  getPodcastRouteDepth,
  normalizeFollowedIds,
  parsePodcastRoute,
  type LibraryView,
  type PodcastRoute,
} from "./podcast-route";
import { PodcastSharedDestination } from "./podcast-shared-destination";
import { PodcastShowPage } from "./podcast-show-page";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";
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
  /** The show for `showId`, streaming from the server. */
  show: Promise<PodcastShow | null>;
  /** The show the server rendered this page for, if any. */
  showId: string | null;
}

const noEpisodes: readonly PodcastQueueItem[] = [];
const NowPlayingSheet = lazy(function importNowPlayingSheet() {
  return import("./now-playing-sheet").then(function selectNowPlayingSheet(module) {
    return { default: module.NowPlayingSheet };
  });
});
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
  showId,
}: PodcastsAppProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { goBack, navigate, route } = useIosNavigation({
    createHref: function createRouteHref(nextRoute: PodcastRoute) {
      return createPodcastHref(pathname, nextRoute);
    },
    getDepth: getPodcastRouteDepth,
    parseRoute: parsePodcastRoute,
  });
  const [isNavigating, startNavigation] = useTransition();
  const [openedItem, setOpenedItem] = useState<PodcastQueueItem | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<PodcastTab>>(
    function createVisitedTabs() {
      return new Set([route.tab]);
    },
  );
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isTabBarMinimized, setIsTabBarMinimized] = useState(false);
  const hasNowPlayingOpened = useHasOpened(isNowPlayingOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [previousTab, setPreviousTab] = useState<Exclude<PodcastTab, "search">>(
    route.tab === "search" ? "home" : route.tab,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [now] = useState(function readCurrentTime() {
    return Date.now();
  });
  // Navigation handlers read the latest route from a ref so their identity stays stable across
  // navigations; otherwise every mounted tab and row would re-render on each push.
  const latestRef = useRef({ route });
  useLayoutEffect(function rememberLatestRoute() {
    latestRef.current = { route };
  });
  const tabScrollRefs = useRef(new Map<PodcastTab, HTMLDivElement>());
  const followedPodcasts = useFollowedPodcasts();
  const player = usePodcastPlayerItems();
  const followedShowIds = normalizeFollowedIds(
    followedPodcasts.map(function selectPodcastId(podcast) {
      return podcast.id;
    }),
  );

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

  const knownPodcasts = new Map<string, Podcast>();
  const knownItems = new Map<string, PodcastQueueItem>();
  function rememberItem(item: { episode: PodcastEpisode; podcast: Podcast }) {
    knownPodcasts.set(item.podcast.id, item.podcast);
    knownItems.set(item.episode.id, { podcast: item.podcast, episode: item.episode });
  }
  for (const podcast of [...popular, ...searchResults, ...followedPodcasts])
    knownPodcasts.set(podcast.id, podcast);
  for (const item of player.queue) rememberItem(item);
  if (player.current) rememberItem(player.current);
  if (openedItem) rememberItem(openedItem);

  const routePodcast = route.podcastId ? (knownPodcasts.get(route.podcastId) ?? null) : null;
  const routeItem = route.episodeId ? (knownItems.get(route.episodeId) ?? null) : null;
  // Screens push immediately with what the app already knows; a show's episodes then load
  // through the Server Components for its URL, streaming into the screen's Suspense boundaries.
  // Shows already streamed stay available, so a screen sliding away keeps its episodes and
  // returning to a show does not load it again.
  const [loadedShows, setLoadedShows] = useState<ReadonlyMap<string, Promise<PodcastShow | null>>>(
    function createLoadedShows() {
      return new Map(showId ? [[showId, show]] : []);
    },
  );
  if (showId && loadedShows.get(showId) !== show) {
    setLoadedShows(new Map(loadedShows).set(showId, show));
  }
  const routeShow = route.podcastId ? (loadedShows.get(route.podcastId) ?? null) : null;
  const showDataHref =
    route.podcastId !== null && routeShow === null && routeItem === null
      ? createPodcastHref(pathname, route)
      : null;

  useEffect(
    function loadShowForRoute() {
      if (!showDataHref) return;
      startNavigation(function requestShow() {
        router.replace(showDataHref, { scroll: false });
      });
    },
    [router, showDataHref],
  );

  // Like iOS 26, the tab bar shrinks while scrolling down and returns when scrolling up.
  useEffect(function minimizeTabBarWhileScrolling() {
    const content = contentRef.current;
    if (!content) return;
    const scrollPositions = new WeakMap<HTMLElement, number>();
    let frame = 0;
    function handleScroll(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.hasAttribute("data-ios-scroll")) return;
      const scroller: HTMLElement = target;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function updateTabBar() {
        const previousPosition = scrollPositions.get(scroller) ?? 0;
        const position = scroller.scrollTop;
        scrollPositions.set(scroller, position);
        if (position < 80) setIsTabBarMinimized(false);
        else if (position - previousPosition > 6) setIsTabBarMinimized(true);
        else if (previousPosition - position > 6) setIsTabBarMinimized(false);
      });
    }
    content.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return function stopWatchingScroll() {
      cancelAnimationFrame(frame);
      content.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

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

  const isStackOpen = route.podcastId !== null;
  const mountedTabs = new Set([...visitedTabs, route.tab]);
  const tabTitles: Record<PodcastTab, string> = {
    home: messages.Home,
    new: messages.New,
    library: messages.Library,
    search: messages.Search,
  };

  function openShow(podcast: Podcast) {
    navigate({ ...latestRef.current.route, podcastId: podcast.id, episodeId: null });
  }

  function openEpisode(item: PodcastQueueItem) {
    setOpenedItem(item);
    navigate({
      ...latestRef.current.route,
      podcastId: item.podcast.id,
      episodeId: item.episode.id,
    });
  }

  function goToShow(item: PodcastQueueItem) {
    const currentRoute = latestRef.current.route;
    setIsNowPlayingOpen(false);
    if (currentRoute.podcastId === item.podcast.id && currentRoute.episodeId === null) return;
    navigate({ ...currentRoute, podcastId: item.podcast.id, episodeId: null });
  }

  function openLibraryView(view: LibraryView) {
    navigate({ ...createTabRoute("library"), libraryView: view });
  }

  function selectTab(tab: PodcastTab) {
    setIsTabBarMinimized(false);
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
    navigate(nextRoute, { direction: "none", history: "root" });
    if (tab === "new" && followedShowIds.join(",") !== newEpisodesShowIds.join(",")) {
      startNavigation(function loadNewEpisodes() {
        router.replace(createPodcastHref(pathname, nextRoute), { scroll: false });
      });
    }
  }

  function search(query: string) {
    const nextRoute = { ...createTabRoute("search"), query };
    navigate(nextRoute, { direction: "none", history: "replace" });
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
    const { getEpisodeHref, getShowHref } = getTabHrefs(pathname, tab);
    if (tab === "home") {
      return (
        <PodcastsHomeTab
          onShareShow={shareShow}
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
          items={
            newEpisodesShowIds.join(",") === followedShowIds.join(",") ? newEpisodes : noEpisodes
          }
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
          onShareShow={shareShow}
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
        onShareShow={shareShow}
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

  function closeEpisode() {
    goBack({ ...latestRef.current.route, episodeId: null });
  }

  function closeShow() {
    goBack({ ...latestRef.current.route, podcastId: null, episodeId: null });
  }

  function renderStackPage() {
    const { getEpisodeHref, getShowHref } = getTabHrefs(pathname, route.tab);
    const loadingPlaceholder = (
      <PodcastStackPlaceholder title={messages.Episodes} message={messages["Loading episodes"]} />
    );
    const episodePageProps = {
      getShowHref,
      locale,
      messages,
      now,
      onBack: closeEpisode,
      onGoToShow: goToShow,
      onShare: shareEpisode,
    };
    const showPageProps = {
      backLabel: route.libraryView ? messages.Library : tabTitles[route.tab],
      getEpisodeHref,
      locale,
      messages,
      now,
      onBack: closeShow,
      onOpenEpisode: openEpisode,
      onShare: shareEpisode,
      onShareShow: shareShow,
      show: routeShow,
    };

    if (route.episodeId && routeItem) {
      return (
        <PodcastEpisodePage key={routeItem.episode.id} item={routeItem} {...episodePageProps} />
      );
    }
    if (!route.episodeId && routePodcast) {
      return <PodcastShowPage key={routePodcast.id} podcast={routePodcast} {...showPageProps} />;
    }
    // A shared link to a show or episode the app has not seen in a list waits for its details.
    if (!routeShow) return loadingPlaceholder;
    return (
      <Suspense fallback={loadingPlaceholder}>
        <PodcastSharedDestination
          episodeId={route.episodeId}
          show={routeShow}
          episodePageProps={episodePageProps}
          showPageProps={showPageProps}
        />
      </Suspense>
    );
  }

  return (
    <div className="relative size-full bg-black">
      <div
        data-active={isNowPlayingOpen && player.current !== null ? "" : undefined}
        className="relative flex size-full origin-[center_top] flex-col overflow-hidden bg-(--ios-background) transition-[transform,border-radius] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-active:translate-y-2.5 data-active:scale-[0.93] data-active:rounded-[38px] motion-reduce:transition-none md:flex-row md:data-active:scale-[0.97]"
      >
        <PodcastsTabBar
          activeTab={route.tab}
          hasAccessory={player.current !== null}
          isMinimized={isTabBarMinimized && route.tab !== "search"}
          previousTab={previousTab}
          messages={messages}
          searchInput={searchInput.value}
          onSearchInputChange={searchInput.updateValue}
          onSearchSubmit={function submitSearch() {
            searchInput.searchNow(searchInput.value);
          }}
          onSelectTab={selectTab}
        />
        <div ref={contentRef} className="relative min-h-0 min-w-0 flex-1">
          <IosScreenTransition>
            <div className="absolute inset-0 overflow-hidden bg-(--ios-background)">
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
            </div>
          </IosScreenTransition>
          {isStackOpen ? (
            <IosScreenTransition>
              <div className="absolute inset-0 z-10 bg-(--ios-background)">{renderStackPage()}</div>
            </IosScreenTransition>
          ) : null}
          <PodcastMiniPlayer
            isTabBarMinimized={isTabBarMinimized && route.tab !== "search"}
            messages={messages}
            onOpen={function openNowPlaying() {
              setIsNowPlayingOpen(true);
            }}
          />
        </div>
      </div>
      {hasNowPlayingOpened ? (
        <IosErrorBoundary
          resetKey={isNowPlayingOpen}
          onError={function closeNowPlaying() {
            setIsNowPlayingOpen(false);
          }}
        >
          <Suspense fallback={null}>
            <NowPlayingSheet
              open={isNowPlayingOpen}
              onOpenChange={setIsNowPlayingOpen}
              locale={locale}
              messages={messages}
              now={now}
              onGoToShow={goToShow}
              onShare={shareEpisode}
            />
          </Suspense>
        </IosErrorBoundary>
      ) : null}
      <IosToast message={statusMessage} />
    </div>
  );
}

interface TabHrefs {
  getEpisodeHref: (item: PodcastQueueItem) => string;
  getShowHref: (podcast: Podcast) => string;
}

const tabHrefsCache = new Map<string, TabHrefs>();

/** Stable, cached link builders for destinations pushed from each tab. */
function getTabHrefs(pathname: string, tab: PodcastTab): TabHrefs {
  const cacheKey = `${pathname}|${tab}`;
  let hrefs = tabHrefsCache.get(cacheKey);
  if (!hrefs) {
    hrefs = {
      getEpisodeHref(item) {
        return createPodcastHref(pathname, {
          ...createTabRoute(tab),
          podcastId: item.podcast.id,
          episodeId: item.episode.id,
        });
      },
      getShowHref(podcast) {
        return createPodcastHref(pathname, { ...createTabRoute(tab), podcastId: podcast.id });
      },
    };
    tabHrefsCache.set(cacheKey, hrefs);
  }
  return hrefs;
}
