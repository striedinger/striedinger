"use client";

import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { IosMenuAction } from "../../components/ios/ios-menu";
import type { PodcastMessages, PodcastProgress, PodcastQueueItem } from "./types";

import { EpisodeMenu } from "./episode-menu";
import { PodcastArtwork } from "./podcast-artwork";
import { formatEpisodeDate, formatListeningDuration } from "./podcast-format";
import { PodcastLink } from "./podcast-link";
import { playEpisode, togglePlayback } from "./podcast-player-store";
import { useArtworkColor } from "./use-artwork-color";

interface UpNextCardProps {
  extraActions?: readonly IosMenuAction[];
  href: string;
  isCurrent: boolean;
  isPlaying: boolean;
  item: PodcastQueueItem;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onGoToShow: (item: PodcastQueueItem) => void;
  onOpen: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  progress: PodcastProgress | undefined;
}

export function UpNextCard({
  extraActions,
  href,
  isCurrent,
  isPlaying,
  item,
  locale,
  messages,
  now,
  onGoToShow,
  onOpen,
  onShare,
  progress,
}: UpNextCardProps) {
  const artworkColor = useArtworkColor(item.podcast.artworkUrl);
  const durationSeconds = progress?.durationSeconds || item.episode.durationMilliseconds / 1_000;
  const remainingSeconds = progress
    ? Math.max(0, durationSeconds - progress.positionSeconds)
    : durationSeconds;
  const progressRatio =
    progress && durationSeconds > 0 ? progress.positionSeconds / durationSeconds : 0;
  const timeLabel =
    remainingSeconds > 0
      ? progress
        ? messages["{time} left"].replace(
            "{time}",
            formatListeningDuration(remainingSeconds, locale),
          )
        : formatListeningDuration(remainingSeconds, locale)
      : messages.Play;

  return (
    <li
      className="relative flex w-[min(82vw,340px)] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] bg-[#3a3a3c] p-4 text-white shadow-[0_4px_16px_rgb(0_0_0/0.12)] transition-[background-color] duration-500 md:w-[340px]"
      style={artworkColor ? { backgroundColor: artworkColor } : undefined}
    >
      <div className="flex items-center gap-3">
        <PodcastArtwork src={item.podcast.artworkUrl} sizes="64px" className="w-16 rounded-md" />
        <span className="flex min-w-0 flex-col">
          <Text
            as="span"
            className="text-[12px] leading-4 font-semibold tracking-[0.04em] text-white/70 uppercase"
          >
            {progress ? messages.Resume : messages["New Episode"]}
          </Text>
          <Text
            as="span"
            className="text-[12px] leading-4 font-semibold tracking-[0.04em] text-white/70 uppercase"
          >
            {formatEpisodeDate(item.episode.publishedAt, locale, now)}
          </Text>
        </span>
      </div>
      <PodcastLink
        href={href}
        className="mt-3 outline-none after:absolute after:inset-0 focus-visible:underline"
        onOpen={function openEpisode() {
          onOpen(item);
        }}
      >
        <Text
          as="span"
          numberOfLines={2}
          className="text-[20px] leading-[25px] font-bold tracking-[0.38px] text-white"
        >
          {item.episode.title}
        </Text>
      </PodcastLink>
      <Text
        numberOfLines={2}
        className="mt-1 min-h-10 text-[15px] leading-5 tracking-[-0.23px] text-white/70"
      >
        {item.episode.description}
      </Text>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <button
          type="button"
          aria-label={`${isCurrent && isPlaying ? messages.Pause : messages.Play}: ${item.episode.title}`}
          className="relative z-10 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70"
          style={artworkColor ? { color: artworkColor } : undefined}
          onClick={function playOrPause() {
            if (isCurrent) togglePlayback();
            else playEpisode(item);
          }}
        >
          {isCurrent && isPlaying ? (
            <PauseFillIcon className="size-3" />
          ) : (
            <PlayFillIcon className="size-3" />
          )}
          {progressRatio > 0 ? (
            <span
              aria-hidden="true"
              className="relative h-1 w-7 overflow-hidden rounded-full bg-current/25"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-current"
                style={{ width: `${Math.max(4, progressRatio * 100)}%` }}
              />
            </span>
          ) : null}
          <span className="tabular-nums">{timeLabel}</span>
        </button>
        <EpisodeMenu
          item={item}
          messages={messages}
          extraActions={extraActions}
          onGoToShow={onGoToShow}
          onShare={onShare}
          trigger={
            <button
              type="button"
              aria-label={`${messages.More}: ${item.episode.title}`}
              className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white/15 text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-60"
            >
              <EllipsisIcon className="size-4" />
            </button>
          }
        />
      </div>
    </li>
  );
}
