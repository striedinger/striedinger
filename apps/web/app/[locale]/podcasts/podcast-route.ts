import type { Podcast, PodcastEpisode, PodcastTab } from "./types";

export type LibraryView = "shows" | "saved" | "recent";

/** Where a Podcasts URL points, read from the segments below the Podcasts layout. */
export interface PodcastRoute {
  episodeId: string | null;
  libraryView: LibraryView | null;
  podcastId: string | null;
  /** The tab whose root or list the URL shows; null for shows and episodes, which any tab can push. */
  tab: PodcastTab | null;
}

export const libraryViews: readonly LibraryView[] = ["shows", "saved", "recent"];

const basePath = "/podcasts";
const maximumFollowedIds = 20;
const tabRoots: Record<Exclude<PodcastTab, "new">, string> = {
  home: basePath,
  library: `${basePath}/library`,
  search: `${basePath}/search`,
};

export function normalizePodcastId(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return /^\d{1,20}$/.test(normalizedValue) ? normalizedValue : null;
}

export function isLibraryView(value: string | null | undefined): value is LibraryView {
  return libraryViews.includes(value as LibraryView);
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

/** The first value of a search parameter as Next.js passes it to pages. */
export function readSearchParameter(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export function getTabHref(tab: Exclude<PodcastTab, "new">) {
  return tabRoots[tab];
}

/** The New tab for a set of followed shows, whose latest episodes load on the server. */
export function getNewEpisodesHref(followedIds: readonly string[]) {
  const ids = normalizeFollowedIds(followedIds);
  return ids.length > 0 ? `${basePath}/new?shows=${ids.join(",")}` : `${basePath}/new`;
}

export function getLibraryViewHref(view: LibraryView) {
  return `${tabRoots.library}/${view}`;
}

export function getSearchHref(query: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  return normalizedQuery
    ? `${tabRoots.search}?${new URLSearchParams({ q: normalizedQuery })}`
    : tabRoots.search;
}

/** A readable path segment, like Apple Podcasts links: the title's slug followed by the id. */
function createSlugSegment(title: string, id: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return slug ? `${slug}-${id}` : id;
}

/** The id at the end of a slug segment; the slug itself is ignored, so renamed titles still resolve. */
export function readSlugSegmentId(segment: string | null | undefined) {
  return normalizePodcastId(/(?:^|-)(\d{1,20})$/.exec(segment ?? "")?.[1]);
}

export function getShowHref(podcast: Pick<Podcast, "id" | "title">): `/${string}` {
  return `${basePath}/${createSlugSegment(podcast.title, podcast.id)}`;
}

export function getEpisodeHref(item: {
  episode: Pick<PodcastEpisode, "id" | "title">;
  podcast: Pick<Podcast, "id" | "title">;
}): `/${string}` {
  return `${getShowHref(item.podcast)}/${createSlugSegment(item.episode.title, item.episode.id)}`;
}

/** Parses the active segments below the Podcasts layout, as `useSelectedLayoutSegments` returns them. */
export function parsePodcastSegments(segments: readonly string[]): PodcastRoute {
  const [first, second] = segments;
  const route: PodcastRoute = { episodeId: null, libraryView: null, podcastId: null, tab: null };
  if (first === undefined) return { ...route, tab: "home" };
  if (first === "new" || first === "search") return { ...route, tab: first };
  if (first === "library") {
    return { ...route, libraryView: isLibraryView(second) ? second : null, tab: "library" };
  }
  const podcastId = readSlugSegmentId(first);
  return { ...route, episodeId: podcastId ? readSlugSegmentId(second) : null, podcastId };
}

/** The segments below `/podcasts` in a pathname, with or without a locale prefix. */
function readPodcastSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.slice(segments.indexOf("podcasts") + 1);
}

/** How many screens a pathname sits above its tab's root, which orders history moves. */
export function getPodcastPathDepth(pathname: string) {
  const route = parsePodcastSegments(readPodcastSegments(pathname));
  if (route.episodeId) return 3;
  if (route.podcastId) return 2;
  return route.libraryView ? 1 : 0;
}

/** The tab a pathname belongs to; shows and episodes belong to whichever tab pushed them. */
export function getPodcastPathScope(pathname: string) {
  return parsePodcastSegments(readPodcastSegments(pathname)).tab;
}
