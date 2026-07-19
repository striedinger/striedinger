"use server";

import { headers } from "next/headers";

import { getPodcastShow, searchPodcastCatalog } from "../../lib/podcasts/apple-podcasts";
import { isRateLimited } from "../../lib/rate-limit";

export async function searchPodcasts(query: string) {
  const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 80);
  if (normalizedQuery.length < 2) return [];
  await enforcePodcastRateLimit("search", 18);
  return searchPodcastCatalog(normalizedQuery);
}

export async function loadPodcastShow(podcastId: string) {
  if (!/^\d{1,20}$/.test(podcastId)) throw new Error("Invalid podcast");
  await enforcePodcastRateLimit("episodes", 30);
  const [podcast, episodes] = await getPodcastShow(podcastId);
  return { podcast, episodes };
}

async function enforcePodcastRateLimit(scope: string, maximumRequests: number) {
  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  if (
    await isRateLimited({
      identifier,
      maximumRequests,
      scope: `podcasts-${scope}`,
      windowMilliseconds: 60_000,
    })
  ) {
    throw new Error("Rate limit exceeded");
  }
}
