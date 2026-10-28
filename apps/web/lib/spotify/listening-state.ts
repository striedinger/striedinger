import "server-only";
import { cacheLife } from "next/cache";

import type { ListeningState } from "./parse-listening-state";

import { parseCurrentlyPlaying, parseRecentlyPlayed } from "./parse-listening-state";

const spotifyApiUrl = "https://api.spotify.com/v1";
const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const requestTimeoutMs = 4_000;
// Renew a little before Spotify's expiry so a request never starts with a token about to lapse.
const tokenRenewalMarginMs = 60_000;

/**
 * What Hugo is playing on Spotify, or the last thing played when the player is empty. Every
 * viewer shares one reading for a few seconds, so a busy post never runs into Spotify's
 * rate limits.
 */
export async function getListeningState(): Promise<ListeningState> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 8, expire: 60 });

  const credentials = readCredentials();
  if (!credentials) return { status: "unavailable" };

  try {
    const current = await requestSpotify(
      credentials,
      "/me/player/currently-playing?additional_types=episode",
    );
    if (current.ok && current.status !== 204) {
      const state = parseCurrentlyPlaying(await current.json(), Date.now());
      if (state) return state;
    }

    const recent = await requestSpotify(credentials, "/me/player/recently-played?limit=1");
    if (!recent.ok) return { status: "unavailable" };
    return parseRecentlyPlayed(await recent.json());
  } catch {
    return { status: "unavailable" };
  }
}

interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

function readCredentials(): SpotifyCredentials | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

/** Calls the Web API, renewing the access token once if Spotify rejects it before it expires. */
async function requestSpotify(credentials: SpotifyCredentials, path: string) {
  const response = await fetchWithToken(await getAccessToken(credentials), path);
  if (response.status !== 401) return response;
  cachedAccessToken = null;
  return fetchWithToken(await getAccessToken(credentials), path);
}

function fetchWithToken(accessToken: string, path: string) {
  return fetch(`${spotifyApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}

// Kept in memory, not in the Next.js cache, so the token and the secrets that mint it never
// become cache keys or entries, and a rejected token can be dropped at once.
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken({ clientId, clientSecret, refreshToken }: SpotifyCredentials) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.value;
  }

  const response = await fetch(spotifyTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw new Error(`Spotify token request failed with ${response.status}`);
  const payload = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof payload.access_token !== "string") throw new Error("Spotify returned no token");
  const lifetimeSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3_600;
  cachedAccessToken = {
    value: payload.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1_000 - tokenRenewalMarginMs,
  };
  return cachedAccessToken.value;
}
