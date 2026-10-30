import "server-only";
import { getUpstashRestCredentials } from "../../lib/upstash-rest-credentials";

const visitsListKey = "card:visits";
const visitKeyPrefix = "card:visit:";
const maximumStoredVisits = 10_000;
const visitExpirySeconds = 2_592_000; // 30 days
const crawlerPattern =
  /bot|crawler|spider|facebookexternalhit|slack|discord|whatsapp|telegram|linkedin|pinterest|embedly|cardyb|vkshare|tumblr|dataminr/i;

export interface VisitServerData {
  at: string;
  city: string;
  clientHints: {
    brands: string;
    mobile: string;
    platform: string;
    platformVersion: string;
  };
  country: string;
  doNotTrack: string;
  fetchSite: string;
  ip: string;
  isCrawler: boolean;
  language: string;
  latitude: string;
  longitude: string;
  path: string;
  postalCode: string;
  purpose: string;
  referrer: string;
  region: string;
  requestId: string;
  targetUrl: string;
  timezone: string;
  userAgent: string;
}

export function isCrawler(userAgent: string): boolean {
  return crawlerPattern.test(userAgent);
}

export async function recordVisit(visitId: string, data: VisitServerData) {
  const credentials = getUpstashRestCredentials();

  if (!credentials) {
    // oxlint-disable-next-line no-console -- server logs are the visit record when no KV store is configured
    console.log(`[card-visit] ${visitId}`, JSON.stringify(data));
    return;
  }

  const visitKey = `${visitKeyPrefix}${visitId}`;

  try {
    const response = await fetch(`${credentials.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["HSET", visitKey, "server", JSON.stringify(data)],
        ["EXPIRE", visitKey, visitExpirySeconds],
        ["LPUSH", visitsListKey, visitId],
        ["LTRIM", visitsListKey, 0, maximumStoredVisits - 1],
      ]),
    });

    if (!response.ok) {
      // oxlint-disable-next-line no-console -- surfaces KV failures in the server logs
      console.error(`[card-visit] KV write failed with status ${response.status}`);
    }
  } catch (error) {
    // oxlint-disable-next-line no-console -- surfaces KV failures in the server logs
    console.error("[card-visit] KV write failed", error);
  }
}
