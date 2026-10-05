"use client";

import type { DrawerRootChangeEventDetails } from "@base-ui/react/drawer";
import type { ReactNode } from "react";

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { Podcast, PodcastMessages, PodcastQueueItem } from "./types";

import { IosErrorBoundary } from "../../../components/ios/ios-error-boundary";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosToast } from "../../../components/ios/ios-toast";
import { useHasOpened } from "../../../components/use-has-opened";
import { copyText } from "../../../lib/copy-text";
import { rememberPodcast } from "./podcast-catalog";
import { pausePlayback, usePodcastPlayerItems } from "./podcast-player-store";
import { getEpisodeHref, getPodcastPathScope, getSearchHref, getShowHref } from "./podcast-route";
import { PodcastsBars } from "./podcasts-bars";
import { PodcastsBarsPlaceholder } from "./podcasts-bars-placeholder";
import {
  PodcastsContext,
  PodcastsSearchContext,
  type PodcastsContextValue,
  type PodcastsSearchContextValue,
} from "./podcasts-context";
import { useSearchInput } from "./use-search-input";

interface PodcastsChromeProps {
  aiLabels: OnDeviceAiLabels;
  children: ReactNode;
  locale: string;
  messages: PodcastMessages;
}

const NowPlayingSheet = lazy(function importNowPlayingSheet() {
  return import("./now-playing-sheet").then(function selectNowPlayingSheet(module) {
    return { default: module.NowPlayingSheet };
  });
});

// A tap that opens Now Playing can be followed by stray pointer events on touch screens;
// they should not count as dismissing the sheet it just opened.
const openingGracePeriodMilliseconds = 450;

let appOpenedAt: number | null = null;

function subscribeToNothing() {
  return function unsubscribeFromNothing() {};
}

function readAppOpenedAt() {
  appOpenedAt ??= Date.now();
  return appOpenedAt;
}

function readServerTime() {
  return 0;
}

/**
 * Everything that stays on screen while the routes below change: the tab bar, the Now
 * Playing accessory and sheet, and status toasts. Screens render inside as `children` and
 * reach the app's actions through `PodcastsContext`.
 */
export function PodcastsChrome({ aiLabels, children, locale, messages }: PodcastsChromeProps) {
  const iosRouter = useIosRouter();
  const player = usePodcastPlayerItems();
  const now = useSyncExternalStore(subscribeToNothing, readAppOpenedAt, readServerTime);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isTabBarMinimized, setIsTabBarMinimized] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [urlSearchQuery, setUrlSearchQuery] = useState("");
  const hasNowPlayingOpened = useHasOpened(isNowPlayingOpen);
  const nowPlayingOpenedAtRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInput = useSearchInput(urlSearchQuery, search);
  const isNowPlayingVisible = isNowPlayingOpen && player.current !== null;

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

  function search(query: string) {
    const href = getSearchHref(query);
    if (getPodcastPathScope(window.location.pathname) === "search") iosRouter.replace(href);
    else iosRouter.push(href, { direction: "none" });
  }

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

  function openNowPlaying() {
    nowPlayingOpenedAtRef.current = performance.now();
    setIsNowPlayingOpen(true);
  }

  function changeNowPlayingOpen(open: boolean, details: DrawerRootChangeEventDetails) {
    const isStrayDismissal =
      !open &&
      (details.reason === "outside-press" || details.reason === "focus-out") &&
      performance.now() - nowPlayingOpenedAtRef.current < openingGracePeriodMilliseconds;
    if (isStrayDismissal) return;
    setIsNowPlayingOpen(open);
  }

  const podcastsContext: PodcastsContextValue = {
    aiLabels,
    goToShow(item: PodcastQueueItem) {
      setIsNowPlayingOpen(false);
      rememberPodcast(item.podcast);
      iosRouter.push(getShowHref(item.podcast));
    },
    locale,
    messages,
    now,
    shareEpisode(item: PodcastQueueItem) {
      void shareLink(item.episode.title, getEpisodeHref(item));
    },
    shareShow(podcast: Podcast) {
      void shareLink(podcast.title, getShowHref(podcast));
    },
  };
  const searchContext: PodcastsSearchContextValue = {
    inputValue: searchInput.value,
    searchNow: searchInput.searchNow,
  };
  const barsProps = {
    isTabBarMinimized,
    messages,
    searchInput: searchInput.value,
    onOpenNowPlaying: openNowPlaying,
    onSearchInputChange: searchInput.updateValue,
    onSearchQueryChange: setUrlSearchQuery,
    onSearchSubmit: function submitSearch() {
      searchInput.searchNow(searchInput.value);
    },
    onSelectTab: function restoreTabBar() {
      setIsTabBarMinimized(false);
    },
  };

  return (
    <PodcastsContext value={podcastsContext}>
      <PodcastsSearchContext value={searchContext}>
        <div className="relative size-full bg-black">
          <div
            data-active={isNowPlayingVisible ? "" : undefined}
            className="relative flex size-full origin-[center_top] flex-col overflow-hidden bg-ios-background transition-[transform,border-radius] duration-450 ease-ios data-active:translate-y-2.5 data-active:scale-[0.93] data-active:rounded-ios-sheet motion-reduce:transition-none md:flex-row md:data-active:scale-[0.97]"
          >
            <Suspense fallback={<PodcastsBarsPlaceholder messages={messages} />}>
              <PodcastsBars {...barsProps} />
            </Suspense>
            <div ref={contentRef} className="relative min-h-0 min-w-0 flex-1">
              {children}
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
                <NowPlayingSheet open={isNowPlayingOpen} onOpenChange={changeNowPlayingOpen} />
              </Suspense>
            </IosErrorBoundary>
          ) : null}
          <IosToast message={statusMessage} />
        </div>
      </PodcastsSearchContext>
    </PodcastsContext>
  );
}
