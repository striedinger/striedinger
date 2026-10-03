"use client";

import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef } from "react";

import { handleHistoryTraversal } from "./ios-history-traversal";
import {
  IosNavigationContext,
  type IosNavigateOptions,
  type IosRouter,
} from "./ios-navigation-context";
import { iosNavigationTypes, type IosNavigationDirection } from "./ios-navigation-transition";

interface IosNavigationProviderProps {
  children: ReactNode;
  /**
   * How many screens a pathname sits above its root. History entries the app did not record,
   * such as those from before a reload, use it to tell a pop from a push.
   */
  getDepth: (pathname: string) => number;
  /**
   * The tab a pathname belongs to, or null when it can belong to any tab. Moving between
   * entries of different tabs switches content in place instead of sliding.
   */
  getScope?: (pathname: string) => string | null;
  /** Whether screens currently slide, for layouts that only stack screens on phones. */
  shouldAnimate?: () => boolean;
}

interface HistoryRecord {
  entries: string[];
  index: number;
}

const routerStateKey = "__NA";

function readCurrentHref() {
  return `${window.location.pathname}${window.location.search}`;
}

function resolveHref(href: string) {
  const url = new URL(href, window.location.href);
  return `${url.pathname}${url.search}`;
}

function pathnameOf(href: string) {
  return new URL(href, window.location.origin).pathname;
}

/** Whether a history entry was written by the Next.js router, which marks its entries. */
function isRouterHistoryState(state: unknown) {
  return typeof state === "object" && state !== null && routerStateKey in state;
}

function alwaysAnimate() {
  return true;
}

function noScope() {
  return null;
}

/**
 * Real Next.js routes for the native app replicas, with UINavigationController motion.
 * Pushes and pops are router navigations tagged with an `ios-nav-*` transition type, so
 * `IosScreenTransition` boundaries in each page slide while the layout's bars stay put.
 *
 * Browser back and forward carry no transition type, and React renders updates made during
 * `popstate` synchronously, which skips view transitions. The provider remembers the entries
 * the app pushed, so when the user returns to one it takes the event from the router, through
 * the listener `instrumentation-client.ts` installs ahead of it, and replays it a moment later
 * as a tagged navigation to the same URL. Safari's edge swipe, which animates on its own, is
 * left alone.
 */
export function IosNavigationProvider({
  children,
  getDepth,
  getScope = noScope,
  shouldAnimate = alwaysAnimate,
}: IosNavigationProviderProps) {
  const router = useRouter();
  const historyRef = useRef<HistoryRecord | null>(null);
  const readDepth = useEffectEvent(getDepth);
  const readScope = useEffectEvent(getScope);
  const readShouldAnimate = useEffectEvent(shouldAnimate);

  function readHistory(): HistoryRecord {
    historyRef.current ??= { entries: [readCurrentHref()], index: 0 };
    return historyRef.current;
  }

  function createTransitionTypes(direction: IosNavigationDirection | "none") {
    return direction !== "none" && shouldAnimate() ? [iosNavigationTypes[direction]] : undefined;
  }

  const iosRouter: IosRouter = {
    back(fallbackHref) {
      if (readHistory().index > 0) {
        window.history.back();
        return;
      }
      iosRouter.replace(fallbackHref, { direction: "back" });
    },
    push(href, { direction = "forward" }: IosNavigateOptions = {}) {
      const resolvedHref = resolveHref(href);
      if (resolvedHref === readCurrentHref()) return;
      const history = readHistory();
      history.entries = [...history.entries.slice(0, history.index + 1), resolvedHref];
      history.index += 1;
      router.push(href, { scroll: false, transitionTypes: createTransitionTypes(direction) });
    },
    replace(href, { direction = "none" }: IosNavigateOptions = {}) {
      const resolvedHref = resolveHref(href);
      if (resolvedHref === readCurrentHref()) return;
      const history = readHistory();
      history.entries[history.index] = resolvedHref;
      router.replace(href, { scroll: false, transitionTypes: createTransitionTypes(direction) });
    },
  };

  useEffect(
    function animateHistoryTraversal() {
      let pendingTimeout = 0;

      function readTraversalDirection(href: string): IosNavigationDirection | null {
        historyRef.current ??= { entries: [href], index: 0 };
        const history = historyRef.current;
        const previousHref = history.entries[history.index] ?? href;
        let direction: IosNavigationDirection;
        if (history.entries[history.index - 1] === href) {
          history.index -= 1;
          direction = "back";
        } else if (history.entries[history.index + 1] === href) {
          history.index += 1;
          direction = "forward";
        } else {
          history.entries = [href];
          history.index = 0;
          const depthChange = readDepth(pathnameOf(href)) - readDepth(pathnameOf(previousHref));
          return depthChange < 0 ? "back" : depthChange > 0 ? "forward" : null;
        }
        const previousScope = readScope(pathnameOf(previousHref));
        const nextScope = readScope(pathnameOf(href));
        return previousScope && nextScope && previousScope !== nextScope ? null : direction;
      }

      function replayTraversal(event: PopStateEvent) {
        const href = readCurrentHref();
        const direction = readTraversalDirection(href);
        const isRouterEntry = isRouterHistoryState(event.state);
        if (!direction || !isRouterEntry || event.hasUAVisualTransition || !readShouldAnimate()) {
          return;
        }
        event.stopImmediatePropagation();
        window.clearTimeout(pendingTimeout);
        pendingTimeout = window.setTimeout(function showRestoredScreen() {
          router.replace(href, {
            scroll: false,
            transitionTypes: [iosNavigationTypes[direction]],
          });
        });
      }

      const stopHandlingHistoryTraversal = handleHistoryTraversal(replayTraversal);
      return function stopAnimatingHistoryTraversal() {
        window.clearTimeout(pendingTimeout);
        stopHandlingHistoryTraversal();
      };
    },
    [router],
  );

  return <IosNavigationContext value={iosRouter}>{children}</IosNavigationContext>;
}
