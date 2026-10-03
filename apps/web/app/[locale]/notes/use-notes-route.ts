"use client";

import type { NotesRoute } from "./types";

import { useIosNavigation } from "../../../components/ios/use-ios-navigation";

interface RouteLocation {
  pathname: string;
}

const routeParameterPattern = /^[\w-]{1,64}$/;
// Panes sit side by side from this width, so routes change in place instead of pushing.
const stackedLayoutQuery = "(max-width: 767px)";

/** Reads `/notes/[folderId]/[noteId]`, with or without a locale prefix. */
function parseNotesPath({ pathname }: RouteLocation): NotesRoute {
  const segments = pathname.split("/").filter(Boolean);
  const [folderId, noteId] = segments.slice(segments.indexOf("notes") + 1).map(decodeURIComponent);
  const validFolderId = folderId && routeParameterPattern.test(folderId) ? folderId : null;
  return {
    folderId: validFolderId,
    noteId: validFolderId && noteId && routeParameterPattern.test(noteId) ? noteId : null,
  };
}

function getRouteDepth(route: NotesRoute) {
  return route.noteId ? 2 : route.folderId ? 1 : 0;
}

function isStackedLayout() {
  return typeof window.matchMedia === "function" && window.matchMedia(stackedLayoutQuery).matches;
}

/** The URL for a route, keeping the locale prefix the visitor arrived with. */
function createNotesHref(route: NotesRoute, currentPathname: string) {
  const segments = currentPathname.split("/").filter(Boolean);
  const basePath = `/${segments.slice(0, segments.indexOf("notes") + 1).join("/")}`;
  const routeSegments = [route.folderId, route.folderId ? route.noteId : null].filter(
    function isSegment(segment): segment is string {
      return segment !== null;
    },
  );
  return [basePath, ...routeSegments.map(encodeURIComponent)].join("/");
}

function createRouteHref(route: NotesRoute) {
  return createNotesHref(route, window.location.pathname);
}

/** Notes keeps its open folder and note in the path; screens push and pop on phones. */
export function useNotesRoute() {
  return useIosNavigation({
    createHref: createRouteHref,
    getDepth: getRouteDepth,
    parseRoute: parseNotesPath,
    shouldAnimate: isStackedLayout,
  });
}
