"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { PodcastMessages, PodcastProgress, PodcastQueueItem } from "./types";

import { formatListeningDuration } from "./podcast-format";
import { playEpisode, togglePlayback } from "./podcast-player-store";

interface EpisodePlayButtonProps {
  className?: string;
  isCurrent: boolean;
  isPlayed: boolean;
  isPlaying: boolean;
  item: PodcastQueueItem;
  locale: string;
  messages: PodcastMessages;
  progress: PodcastProgress | undefined;
}

/** The capsule beneath an episode that plays it and shows its length or remaining time. */
export function EpisodePlayButton({
  className,
  isCurrent,
  isPlayed,
  isPlaying,
  item,
  locale,
  messages,
  progress,
}: EpisodePlayButtonProps) {
  const durationSeconds = progress?.durationSeconds || item.episode.durationMilliseconds / 1_000;
  const remainingSeconds = progress ? Math.max(0, durationSeconds - progress.positionSeconds) : 0;
  const progressRatio =
    progress && durationSeconds > 0 ? progress.positionSeconds / durationSeconds : 0;
  const label = isPlayed
    ? messages.Played
    : progress && remainingSeconds > 0
      ? messages["{time} left"].replace("{time}", formatListeningDuration(remainingSeconds, locale))
      : durationSeconds > 0
        ? formatListeningDuration(durationSeconds, locale)
        : messages.Play;

  return (
    <button
      type="button"
      aria-label={`${isCurrent && isPlaying ? messages.Pause : messages.Play}: ${item.episode.title}`}
      className={cn(
        "relative z-10 inline-flex h-[30px] items-center gap-1.5 rounded-full bg-ios-tertiary-fill pr-3 pl-2.5 text-[13px] leading-4 font-semibold tracking-[-0.08px] text-ios-tint outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint active:opacity-60",
        className,
      )}
      onClick={function playOrPause() {
        if (isCurrent) togglePlayback();
        else playEpisode(item, { fromStart: isPlayed });
      }}
    >
      {isCurrent && isPlaying ? (
        <PauseFillIcon className="size-3" />
      ) : isPlayed ? (
        <CheckIcon className="size-3" strokeWidth={3.2} />
      ) : (
        <PlayFillIcon className="size-3" />
      )}
      {progress && !isPlayed && progressRatio > 0 ? (
        <span
          aria-hidden="true"
          className="relative h-1 w-7 overflow-hidden rounded-full bg-ios-tint/25"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-ios-tint"
            style={{ width: `${Math.min(100, Math.max(4, progressRatio * 100))}%` }}
          />
        </span>
      ) : null}
      <span className="tabular-nums">{label}</span>
    </button>
  );
}
