/** A song or podcast episode, reduced to what the listening page shows. */
interface ListeningTrack {
  title: string;
  /** The artists of a song, or the show of an episode. */
  subtitle: string;
  album: string;
  /** An `i.scdn.co` artwork URL, or empty when Spotify has none. */
  artworkUrl: string;
  /** The item's `open.spotify.com` page, or empty when Spotify has none. */
  spotifyUrl: string;
  durationMs: number;
}

export type ListeningState =
  | {
      status: "playing" | "paused";
      track: ListeningTrack;
      progressMs: number;
      /** When the progress was read, so the page can advance it between refreshes. */
      observedAt: number;
    }
  | { status: "idle"; track: ListeningTrack | null; playedAt: string | null }
  | { status: "unavailable" };

interface SpotifyImage {
  url?: unknown;
  width?: unknown;
}

interface SpotifyItem {
  type?: unknown;
  name?: unknown;
  duration_ms?: unknown;
  external_urls?: { spotify?: unknown };
  artists?: Array<{ name?: unknown }>;
  album?: { name?: unknown; images?: SpotifyImage[] };
  show?: { name?: unknown; images?: SpotifyImage[] };
  images?: SpotifyImage[];
}

const artworkHost = "i.scdn.co";
const spotifyHost = "open.spotify.com";
// Large enough for the artwork on a high-density phone without downloading the 640px original.
const preferredArtworkWidth = 300;

/** Reads `GET /v1/me/player/currently-playing`; null means nothing is loaded in the player. */
export function parseCurrentlyPlaying(payload: unknown, observedAt: number): ListeningState | null {
  if (!isRecord(payload)) return null;
  const track = parseItem(payload["item"]);
  if (!track) return null;
  const progressMs = clamp(readNumber(payload["progress_ms"]), 0, track.durationMs);
  return {
    status: payload["is_playing"] === true ? "playing" : "paused",
    track,
    progressMs,
    observedAt,
  };
}

/** Reads `GET /v1/me/player/recently-played?limit=1`. */
export function parseRecentlyPlayed(payload: unknown): ListeningState {
  const items: unknown[] =
    isRecord(payload) && Array.isArray(payload["items"]) ? payload["items"] : [];
  const [latest] = items;
  if (!isRecord(latest)) return { status: "idle", track: null, playedAt: null };
  const playedAt =
    typeof latest["played_at"] === "string" && !Number.isNaN(Date.parse(latest["played_at"]))
      ? latest["played_at"]
      : null;
  return { status: "idle", track: parseItem(latest["track"]), playedAt };
}

function parseItem(value: unknown): ListeningTrack | null {
  if (!isRecord(value)) return null;
  const item = value as SpotifyItem;
  const title = readText(item.name);
  if (!title) return null;
  const isEpisode = item.type === "episode";
  const subtitle = isEpisode
    ? readText(item.show?.name)
    : (item.artists ?? [])
        .map(function readArtistName(artist) {
          return readText(artist.name);
        })
        .filter(Boolean)
        .join(", ");
  return {
    title,
    subtitle,
    album: isEpisode ? "" : readText(item.album?.name),
    ...pickArtwork(isEpisode ? pickEpisodeImages(item) : item.album?.images),
    spotifyUrl: readHttpsUrl(item.external_urls?.spotify, spotifyHost),
    durationMs: Math.max(0, readNumber(item.duration_ms)),
  };
}

function pickArtwork(images: SpotifyImage[] | undefined) {
  const candidates = readArtwork(images);
  const preferred =
    candidates.find(function isLargeEnough(image) {
      return image.width >= preferredArtworkWidth;
    }) ?? candidates.at(-1);
  return { artworkUrl: preferred?.url ?? "" };
}

/** An episode's own artwork, or its show's when the episode has none. */
function pickEpisodeImages(item: SpotifyItem) {
  return readArtwork(item.images).length > 0 ? item.images : item.show?.images;
}

/** Spotify's own artwork URLs, smallest first. */
function readArtwork(images: SpotifyImage[] | undefined) {
  return (images ?? [])
    .map(function readImage(image) {
      return { url: readHttpsUrl(image.url, artworkHost), width: readNumber(image.width) };
    })
    .filter(function hasUrl(image) {
      return image.url;
    })
    .toSorted(function byWidth(first, second) {
      return first.width - second.width;
    });
}

function readHttpsUrl(value: unknown, hostname: string) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname ? url.toString() : "";
  } catch {
    return "";
  }
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
