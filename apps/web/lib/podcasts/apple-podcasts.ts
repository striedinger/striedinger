import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import type { Podcast, PodcastEpisode } from "../../app/podcasts/types";

const appleSearchBaseUrl = "https://itunes.apple.com";
const appleChartsUrl =
  "https://rss.marketingtools.apple.com/api/v2/us/podcasts/top/20/podcasts.json";

interface AppleChartResponse {
  feed?: {
    results?: AppleChartPodcast[];
  };
}

interface AppleChartPodcast {
  artistName?: unknown;
  artworkUrl100?: unknown;
  genres?: Array<{ name?: unknown }>;
  id?: unknown;
  name?: unknown;
  url?: unknown;
}

interface AppleSearchResponse {
  results?: AppleSearchResult[];
}

interface AppleSearchResult {
  artistName?: unknown;
  artworkUrl100?: unknown;
  artworkUrl600?: unknown;
  collectionId?: unknown;
  collectionName?: unknown;
  collectionViewUrl?: unknown;
  contentAdvisoryRating?: unknown;
  description?: unknown;
  episodeContentType?: unknown;
  episodeUrl?: unknown;
  kind?: unknown;
  primaryGenreName?: unknown;
  releaseDate?: unknown;
  shortDescription?: unknown;
  trackId?: unknown;
  trackCount?: unknown;
  trackName?: unknown;
  trackTimeMillis?: unknown;
  wrapperType?: unknown;
}

export function getPopularPodcasts(): Promise<Podcast[]> {
  return loadPopularPodcasts();
}

async function loadPopularPodcasts(): Promise<Podcast[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3_600, expire: 86_400 });
  cacheTag("podcast-charts");

  const response = await fetch(appleChartsUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3_600 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Podcast chart request failed");
  const payload = (await response.json()) as AppleChartResponse;
  return (payload.feed?.results ?? []).flatMap(function mapChartPodcast(result) {
    const id = stringValue(result.id);
    const title = stringValue(result.name);
    const author = stringValue(result.artistName);
    const artworkUrl = upgradeArtwork(stringValue(result.artworkUrl100));
    const url = safeHttpsUrl(stringValue(result.url));
    if (!id || !title || !author || !artworkUrl || !url) return [];
    return [{ id, title, author, artworkUrl, url, genre: stringValue(result.genres?.[0]?.name) }];
  });
}

export function searchPodcastCatalog(query: string): Promise<Podcast[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ").toLocaleLowerCase().slice(0, 80);
  if (normalizedQuery.length < 2) return Promise.resolve([]);
  return loadPodcastCatalog({ query: normalizedQuery });
}

async function loadPodcastCatalog({ query }: { query: string }): Promise<Podcast[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3_600, expire: 86_400 });
  cacheTag("podcast-search", `podcast-search:${query}`);

  const parameters = new URLSearchParams({
    country: "us",
    entity: "podcast",
    explicit: "Yes",
    limit: "24",
    media: "podcast",
    term: query,
  });
  const response = await fetch(`${appleSearchBaseUrl}/search?${parameters}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3_600 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Podcast search request failed");
  const payload = (await response.json()) as AppleSearchResponse;
  return (payload.results ?? []).flatMap(mapSearchPodcast);
}

export function getPodcast(podcastId: string): Promise<Podcast | null> {
  return loadPodcast({ podcastId });
}

async function loadPodcast({ podcastId }: { podcastId: string }): Promise<Podcast | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3_600, expire: 86_400 });
  cacheTag("podcast-details", `podcast:${podcastId}`);

  const parameters = new URLSearchParams({ id: podcastId });
  const response = await fetch(`${appleSearchBaseUrl}/lookup?${parameters}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3_600 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Podcast lookup request failed");
  const payload = (await response.json()) as AppleSearchResponse;
  return (payload.results ?? []).flatMap(mapSearchPodcast)[0] ?? null;
}

export async function getPodcastEpisodes(podcastId: string): Promise<PodcastEpisode[]> {
  const [, episodes] = await getPodcastShow(podcastId);
  return episodes;
}

export function getPodcastShow(podcastId: string): Promise<[Podcast | null, PodcastEpisode[]]> {
  return loadPodcastShow({ podcastId });
}

async function loadPodcastShow({
  podcastId,
}: {
  podcastId: string;
}): Promise<[Podcast | null, PodcastEpisode[]]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3_600 });
  cacheTag("podcast-shows", `podcast-show:${podcastId}`);

  const parameters = new URLSearchParams({
    entity: "podcastEpisode",
    id: podcastId,
    limit: "21",
  });
  const response = await fetch(`${appleSearchBaseUrl}/lookup?${parameters}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Podcast episode request failed");
  const payload = (await response.json()) as AppleSearchResponse;
  const results = payload.results ?? [];
  return [results.flatMap(mapSearchPodcast)[0] ?? null, results.flatMap(mapEpisode).slice(0, 20)];
}

function mapSearchPodcast(result: AppleSearchResult): Podcast[] {
  if (result.kind !== "podcast") return [];
  const id = numberString(result.collectionId);
  const title = stringValue(result.collectionName);
  const author = stringValue(result.artistName);
  const artworkUrl = safeHttpsUrl(
    upgradeArtwork(stringValue(result.artworkUrl600) || stringValue(result.artworkUrl100)),
  );
  const url = safeHttpsUrl(stringValue(result.collectionViewUrl));
  if (!id || !title || !author || !artworkUrl || !url) return [];
  return [
    {
      id,
      title: title.slice(0, 200),
      author: author.slice(0, 160),
      artworkUrl,
      url,
      genre: stringValue(result.primaryGenreName).slice(0, 80),
      episodeCount: positiveInteger(result.trackCount),
      explicit: stringValue(result.contentAdvisoryRating).toLowerCase() === "explicit",
      latestReleaseAt: validDate(stringValue(result.releaseDate))
        ? stringValue(result.releaseDate)
        : undefined,
    },
  ];
}

function mapEpisode(result: AppleSearchResult): PodcastEpisode[] {
  if (result.wrapperType !== "podcastEpisode" || result.episodeContentType !== "audio") return [];
  const id = numberString(result.trackId);
  const title = stringValue(result.trackName);
  const audioUrl = safeHttpUrl(stringValue(result.episodeUrl));
  const publishedAt = stringValue(result.releaseDate);
  if (!id || !title || !audioUrl || !validDate(publishedAt)) return [];
  return [
    {
      id,
      title: title.slice(0, 240),
      audioUrl,
      publishedAt,
      durationMilliseconds:
        typeof result.trackTimeMillis === "number" && Number.isFinite(result.trackTimeMillis)
          ? Math.max(0, result.trackTimeMillis)
          : 0,
      description: (stringValue(result.shortDescription) || stringValue(result.description)).slice(
        0,
        600,
      ),
    },
  ];
}

function upgradeArtwork(url: string) {
  return url.replace(/\/\d+x\d+bb\.(jpg|jpeg|png)$/i, "/600x600bb.$1");
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function safeHttpsUrl(value: string) {
  const url = safeHttpUrl(value);
  return url.startsWith("https:") ? url : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberString(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? String(value) : "";
}

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function validDate(value: string) {
  return value.length <= 40 && Number.isFinite(Date.parse(value));
}
