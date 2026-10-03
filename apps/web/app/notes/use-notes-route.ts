"use client";

import { useSyncExternalStore } from "react";

import type { NotesRoute } from "./types";

import {
  runIosStackTransition,
  type IosStackDirection,
} from "../../components/ios/ios-stack-transition";

export const notesStackTransitionName = "ios-notes-stack";

const routeChangeEvent = "ios-notes-route-change";
const historyDepthKey = "iosNotesDepth";
const routeParameterPattern = /^[\w-]{1,64}$/;

function subscribeToLocation(onLocationChange: () => void) {
  let previousSearch = window.location.search;
  function handleRouteChange() {
    previousSearch = window.location.search;
    onLocationChange();
  }
  function handlePopState(event: PopStateEvent) {
    const previousRoute = parseRoute(previousSearch);
    previousSearch = window.location.search;
    const nextRoute = parseRoute(previousSearch);
    const direction = getRouteDepth(nextRoute) < getRouteDepth(previousRoute) ? "back" : "forward";
    const hasBrowserTransition = event.hasUAVisualTransition;
    runIosStackTransition({
      commit: onLocationChange,
      direction: hasBrowserTransition ? "none" : direction,
      narrowScreensOnly: true,
      transitionName: notesStackTransitionName,
    });
  }
  window.addEventListener("popstate", handlePopState);
  window.addEventListener(routeChangeEvent, handleRouteChange);
  return function unsubscribeFromLocation() {
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener(routeChangeEvent, handleRouteChange);
  };
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return "";
}

function parseRoute(search: string): NotesRoute {
  const parameters = new URLSearchParams(search);
  const folderId = parameters.get("folder");
  const noteId = parameters.get("note");
  return {
    folderId: folderId && routeParameterPattern.test(folderId) ? folderId : null,
    noteId: noteId && routeParameterPattern.test(noteId) ? noteId : null,
  };
}

function getHistoryDepth() {
  const state: unknown = window.history.state;
  if (!state || typeof state !== "object") return 0;
  const depth = (state as Record<string, unknown>)[historyDepthKey];
  return typeof depth === "number" && Number.isSafeInteger(depth) && depth > 0 ? depth : 0;
}

function getRouteDepth(route: NotesRoute) {
  return route.noteId ? 2 : route.folderId ? 1 : 0;
}

function createRouteUrl(route: NotesRoute) {
  const parameters = new URLSearchParams(window.location.search);
  parameters.delete("folder");
  parameters.delete("note");
  if (route.folderId) parameters.set("folder", route.folderId);
  if (route.noteId) parameters.set("note", route.noteId);
  const search = parameters.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}`;
}

export function useNotesRoute() {
  const search = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerLocationSearch,
  );
  const route = parseRoute(search);

  function navigate(
    nextRoute: NotesRoute,
    {
      direction = "forward",
      replace = false,
    }: { direction?: IosStackDirection; replace?: boolean } = {},
  ) {
    runIosStackTransition({
      commit: function commitRoute() {
        const url = createRouteUrl(nextRoute);
        const depth = getHistoryDepth();
        if (replace) window.history.replaceState({ [historyDepthKey]: depth }, "", url);
        else window.history.pushState({ [historyDepthKey]: depth + 1 }, "", url);
        window.dispatchEvent(new Event(routeChangeEvent));
      },
      direction,
      narrowScreensOnly: true,
      transitionName: notesStackTransitionName,
    });
  }

  /** Pops the in-app history entry when there is one, so the browser back stack stays intact. */
  function goBack(parentRoute: NotesRoute) {
    if (getHistoryDepth() > 0) {
      window.history.back();
      return;
    }
    navigate(parentRoute, { direction: "back", replace: true });
  }

  return { goBack, navigate, route };
}
