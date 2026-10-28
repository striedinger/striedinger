import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";

import type { ListeningState } from "../../../lib/spotify/parse-listening-state";

import { EqualizerBars } from "./equalizer-bars";
import { ListeningAppSwitcherButton } from "./listening-app-switcher-button";
import {
  nowPlayingArtworkClassName,
  nowPlayingDetailsClassName,
  nowPlayingFrameClassName,
  nowPlayingPlatterClassName,
  nowPlayingSubtitleClassName,
  nowPlayingTitleClassName,
} from "./now-playing-layout";
import { PlaybackProgress } from "./playback-progress";
import { SpotifyLogo } from "./spotify-logo";

export interface NowPlayingLabels {
  title: string;
  nothingPlaying: string;
  checkBack: string;
  openInSpotify: string;
  openSpotify: string;
  /** Contains `{album}`. */
  cover: string;
  playbackPosition: string;
  /** Contains `{elapsed}` and `{total}`. */
  progressValue: string;
}

interface NowPlayingCardProps {
  /** How far into the song playback is, or null when nothing is loaded in the player. */
  elapsedMs: number | null;
  labels: NowPlayingLabels;
  state: ListeningState;
  /** Listening now, Paused, Last played 2 hours ago, and so on. */
  statusLabel: string;
}

// The blurred backdrop and the artwork share one source, size, and quality, so the browser
// downloads the cover once.
const artworkSizes = "(max-width: 40rem) 30vw, 17.5rem";
const artworkQuality = 75;

/**
 * The iOS Now Playing player, scaled to whatever frame holds it: the X player card on a phone
 * (343 × 193) or desktop (506 × 285), or a full browser window.
 */
export function NowPlayingCard({ elapsedMs, labels, state, statusLabel }: NowPlayingCardProps) {
  const track = state.status === "unavailable" ? null : state.track;
  const isPlaying = state.status === "playing";

  return (
    <article aria-label={labels.title} className={nowPlayingFrameClassName}>
      {track?.artworkUrl ? (
        <Image
          src={track.artworkUrl}
          alt=""
          fill
          sizes={artworkSizes}
          quality={artworkQuality}
          className="-z-20 scale-150 object-cover blur-3xl saturate-200"
        />
      ) : (
        <div className="absolute inset-0 -z-20 bg-linear-to-br from-ios-purple/45 via-ios-blue/30 to-ios-tint/35" />
      )}
      <div className="absolute inset-0 -z-10 bg-ios-background/10 dark:bg-ios-background/35" />

      <div className="absolute top-3 left-3 z-10">
        <ListeningAppSwitcherButton />
      </div>

      <section className={nowPlayingPlatterClassName}>
        <div
          className={cn(
            nowPlayingArtworkClassName,
            "shadow-ios-floating after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border-[0.5px] after:border-black/10 dark:after:border-white/10",
            !track?.artworkUrl && "grid place-items-center bg-ios-fill",
          )}
        >
          {track?.artworkUrl ? (
            <Image
              src={track.artworkUrl}
              alt={track.album ? labels.cover.replace("{album}", track.album) : ""}
              fill
              sizes={artworkSizes}
              quality={artworkQuality}
              priority
              className="object-cover"
            />
          ) : (
            <SpotifyLogo className="size-1/3 text-ios-tint" />
          )}
        </div>

        <div className={nowPlayingDetailsClassName}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <Text className="flex items-center gap-1.5 text-ios-caption1 font-semibold text-ios-secondary-label">
              <EqualizerBars isPlaying={isPlaying} />
              <span className="truncate">{statusLabel}</span>
            </Text>
            <Text
              as="h2"
              weight="semibold"
              className={cn(nowPlayingTitleClassName, "truncate text-ios-label")}
            >
              {track?.spotifyUrl ? (
                <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer">
                  {track.title}
                </a>
              ) : (
                (track?.title ?? labels.nothingPlaying)
              )}
            </Text>
            <Text className={cn(nowPlayingSubtitleClassName, "truncate text-ios-secondary-label")}>
              {track ? describeTrack(track) : labels.checkBack}
            </Text>
          </div>

          {track && elapsedMs !== null && track.durationMs > 0 ? (
            <PlaybackProgress
              // A new reading remounts the bar, so it jumps to a new song's start.
              key={`${track.spotifyUrl}-${elapsedMs}`}
              durationMs={track.durationMs}
              elapsedMs={elapsedMs}
              isPlaying={isPlaying}
              labels={{
                playbackPosition: labels.playbackPosition,
                progressValue: labels.progressValue,
              }}
            />
          ) : null}

          <a
            href={track?.spotifyUrl || "https://open.spotify.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-7.5 items-center gap-1.5 self-start rounded-full bg-ios-fill px-3.25 text-ios-footnote font-semibold whitespace-nowrap text-ios-label shadow-ios-highlight transition-transform duration-150 ease-ios active:scale-95 motion-reduce:transition-none"
          >
            <SpotifyLogo className="size-3.75 text-ios-tint" />
            {track?.spotifyUrl ? labels.openInSpotify : labels.openSpotify}
          </a>
        </div>
      </section>
    </article>
  );
}

/** The artists and album, leaving out the album of a single, which repeats the song's name. */
function describeTrack(track: { album: string; subtitle: string; title: string }) {
  const album = track.album === track.title ? "" : track.album;
  return [track.subtitle, album].filter(Boolean).join(" · ");
}
