"use client";

import type { NotesRoute } from "./types";

import { useIosNavigation } from "../../components/ios/use-ios-navigation";

interface RouteParameters {
  get(name: string): string | null;
}

const routeParameterPattern = /^[\w-]{1,64}$/;
// Panes sit side by side from this width, so routes change in place instead of pushing.
const stackedLayoutQuery = "(max-width: 767px)";

function parseRoute(parameters: RouteParameters): NotesRoute {
  const folderId = parameters.get("folder");
  const noteId = parameters.get("note");
  return {
    folderId: folderId && routeParameterPattern.test(folderId) ? folderId : null,
    noteId: noteId && routeParameterPattern.test(noteId) ? noteId : null,
  };
}

function getRouteDepth(route: NotesRoute) {
  return route.noteId ? 2 : route.folderId ? 1 : 0;
}

function isStackedLayout() {
  return typeof window.matchMedia === "function" && window.matchMedia(stackedLayoutQuery).matches;
}

function createRouteHref(route: NotesRoute) {
  const parameters = new URLSearchParams(window.location.search);
  parameters.delete("folder");
  parameters.delete("note");
  if (route.folderId) parameters.set("folder", route.folderId);
  if (route.noteId) parameters.set("note", route.noteId);
  const search = parameters.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}`;
}

/** Notes keeps its open folder and note in the URL; screens push and pop on phones. */
export function useNotesRoute() {
  return useIosNavigation({
    createHref: createRouteHref,
    getDepth: getRouteDepth,
    parseRoute,
    shouldAnimate: isStackedLayout,
  });
}
