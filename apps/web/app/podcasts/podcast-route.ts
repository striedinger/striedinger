import type { PodcastTab } from "./types";

export type LibraryView = "shows" | "saved" | "recent";

export interface PodcastRoute {
  episodeId: string | null;
  followedIds: readonly string[];
  libraryView: LibraryView | null;
  podcastId: string | null;
  query: string;
  tab: PodcastTab;
}

interface SearchParameterReader {
  get(name: string): string | null;
}

const podcastTabs = new Set<string>(["home", "new", "library", "search"]);
const maximumFollowedIds = 20;
const libraryViews = new Set<string>(["shows", "saved", "recent"]);

function normalizePodcastId(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return /^\d{1,20}$/.test(normalizedValue) ? normalizedValue : null;
}

/** Sorted, de-duplicated show ids that identify the New tab's server-loaded episodes. */
export function normalizeFollowedIds(ids: readonly string[]) {
  const validIds = ids.flatMap(function keepValidId(id) {
    const normalizedId = normalizePodcastId(id);
    return normalizedId ? [normalizedId] : [];
  });
  return Array.from(new Set(validIds)).toSorted().slice(0, maximumFollowedIds);
}

export function normalizeSearchQuery(value: string | null | undefined) {
  const normalizedValue = value?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
  return normalizedValue.length >= 2 ? normalizedValue : "";
}

export function parsePodcastRoute(parameters: SearchParameterReader): PodcastRoute {
  const query = normalizeSearchQuery(parameters.get("q"));
  const requestedTab = parameters.get("tab") ?? "";
  const tab = podcastTabs.has(requestedTab)
    ? (requestedTab as PodcastTab)
    : query
      ? "search"
      : "home";
  const podcastId = normalizePodcastId(parameters.get("podcast"));
  const requestedView = parameters.get("view") ?? "";
  return {
    episodeId: podcastId ? normalizePodcastId(parameters.get("episode")) : null,
    followedIds:
      tab === "new" ? normalizeFollowedIds((parameters.get("shows") ?? "").split(",")) : [],
    libraryView:
      tab === "library" && libraryViews.has(requestedView) ? (requestedView as LibraryView) : null,
    podcastId,
    query: tab === "search" ? query : "",
    tab,
  };
}

export function createPodcastHref(pathname: string, route: PodcastRoute) {
  const parameters = new URLSearchParams();
  if (route.tab !== "home") parameters.set("tab", route.tab);
  if (route.query) parameters.set("q", route.query);
  if (route.libraryView) parameters.set("view", route.libraryView);
  if (route.tab === "new" && route.followedIds.length > 0) {
    parameters.set("shows", route.followedIds.join(","));
  }
  if (route.podcastId) parameters.set("podcast", route.podcastId);
  if (route.podcastId && route.episodeId) parameters.set("episode", route.episodeId);
  const search = parameters.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** How many screens are pushed above the tab's root, which orders back and forward moves. */
export function getPodcastRouteDepth(route: PodcastRoute) {
  return (
    Number(route.libraryView !== null) +
    Number(route.podcastId !== null) +
    Number(route.episodeId !== null)
  );
}

export function createTabRoute(tab: PodcastTab): PodcastRoute {
  return { episodeId: null, followedIds: [], libraryView: null, podcastId: null, query: "", tab };
}
