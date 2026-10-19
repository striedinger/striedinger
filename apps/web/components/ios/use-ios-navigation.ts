"use client";

import { usePathname } from "next/navigation";
import {
  addTransitionType,
  startTransition,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { iosNavigationTypes, type IosNavigationDirection } from "./ios-navigation-transition";

interface RouteLocation {
  pathname: string;
}

interface IosNavigationOptions<Route> {
  /** The URL for a route, so each screen can be shared and restored. */
  createHref: (route: Route) => string;
  /** How many screens a route sits above its root, which orders back and forward moves. */
  getDepth: (route: Route) => number;
  parseRoute: (location: RouteLocation) => Route;
  /** Whether screens currently slide, for layouts that only stack screens on phones. */
  shouldAnimate?: () => boolean;
}

export interface IosNavigateOptions {
  direction?: IosNavigationDirection | "none";
  /** `replace` swaps the current screen; `root` also starts a new stack, like a tab switch. */
  history?: "push" | "replace" | "root";
}

interface NavigationState<Route> {
  history: "none" | "push" | "replace" | "root";
  route: Route;
}

const depthKey = "iosNavigationDepth";

/** The depth stored with the current history entry, if Next.js has not replaced its state. */
function readHistoryDepth() {
  const state: unknown = window.history.state;
  if (!state || typeof state !== "object") return null;
  const depth = (state as Record<string, unknown>)[depthKey];
  return typeof depth === "number" && Number.isSafeInteger(depth) && depth >= 0 ? depth : null;
}

function alwaysAnimate() {
  return true;
}

function addIosNavigationType(direction: IosNavigationDirection) {
  addTransitionType(iosNavigationTypes[direction]);
}

/**
 * Screen navigation for native app replicas whose content lives only in the browser, such as
 * Notes. Each screen has a real route, so links and reloads open it directly, but moving
 * between screens never waits on the server: the current route lives in React state and
 * changes inside transitions tagged with a direction, so `IosScreenTransition` boundaries push
 * and pop immediately, and the URL follows after each change through the History API, which
 * Next.js keeps `usePathname` in sync with. Apps that load each screen's data on the server
 * use `IosNavigationProvider` and router navigations instead.
 */
export function useIosNavigation<Route>({
  createHref,
  getDepth,
  parseRoute,
  shouldAnimate = alwaysAnimate,
}: IosNavigationOptions<Route>) {
  // The pathname, unlike search parameters, is known while static pages prerender.
  const pathname = usePathname();
  const [navigation, setNavigation] = useState<NavigationState<Route>>(function readInitialRoute() {
    return { history: "none", route: parseRoute({ pathname }) };
  });
  const currentRouteRef = useRef(navigation.route);
  // How many entries the app pushed below the current one. Loading data through the router
  // replaces the entry's state, so the depth is also tracked here.
  const historyDepthRef = useRef(0);
  const readHref = useEffectEvent(createHref);
  const readRoute = useEffectEvent(parseRoute);
  const readDepth = useEffectEvent(getDepth);
  const readShouldAnimate = useEffectEvent(shouldAnimate);

  useLayoutEffect(function rememberCurrentRoute() {
    currentRouteRef.current = navigation.route;
  });

  useEffect(
    function writeRouteToUrl() {
      if (navigation.history === "none") return;
      const href = readHref(navigation.route);
      if (href === `${window.location.pathname}${window.location.search}`) return;
      const depth = readHistoryDepth() ?? historyDepthRef.current;
      const nextDepth =
        navigation.history === "push" ? depth + 1 : navigation.history === "root" ? 0 : depth;
      historyDepthRef.current = nextDepth;
      if (navigation.history === "push") {
        window.history.pushState({ [depthKey]: nextDepth }, "", href);
      } else {
        window.history.replaceState({ [depthKey]: nextDepth }, "", href);
      }
    },
    [navigation],
  );

  // Back and forward show the restored screen, sliding in the matching direction unless the
  // browser already animated its own gesture, as Safari does for an edge swipe. React renders
  // transitions started during `popstate` synchronously, which skips view transitions, so the
  // screen changes right after the event instead.
  useEffect(function followHistoryTraversal() {
    let pendingTimeout = 0;
    function showHistoryEntry(event: PopStateEvent) {
      const route = readRoute({ pathname: window.location.pathname });
      const isPop = readDepth(route) < readDepth(currentRouteRef.current);
      const shouldSlide = !event.hasUAVisualTransition && readShouldAnimate();
      historyDepthRef.current =
        readHistoryDepth() ??
        (isPop ? Math.max(0, historyDepthRef.current - 1) : historyDepthRef.current + 1);
      window.clearTimeout(pendingTimeout);
      pendingTimeout = window.setTimeout(function showRestoredScreen() {
        startTransition(function restoreScreen() {
          if (shouldSlide) addIosNavigationType(isPop ? "back" : "forward");
          setNavigation({ history: "none", route });
        });
      });
    }
    window.addEventListener("popstate", showHistoryEntry);
    return function stopFollowingHistoryTraversal() {
      window.clearTimeout(pendingTimeout);
      window.removeEventListener("popstate", showHistoryEntry);
    };
  }, []);

  function navigate(
    route: Route,
    { direction = "forward", history = "push" }: IosNavigateOptions = {},
  ) {
    startTransition(function showScreen() {
      if (direction !== "none" && shouldAnimate()) addIosNavigationType(direction);
      setNavigation({ history, route });
    });
  }

  /** Pops to the previous screen, using the browser's history entry when the app pushed one. */
  function goBack(parentRoute: Route) {
    if ((readHistoryDepth() ?? historyDepthRef.current) > 0) {
      window.history.back();
      return;
    }
    navigate(parentRoute, { direction: "back", history: "replace" });
  }

  return { goBack, navigate, route: navigation.route };
}
