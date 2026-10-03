"use client";

import { GoForwardIcon } from "@workspace/icons/go-forward-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { PodcastMessages } from "./types";

import { PodcastArtwork } from "./podcast-artwork";
import {
  skipForward,
  skipForwardSeconds,
  togglePlayback,
  usePodcastPlayer,
} from "./podcast-player-store";

interface PodcastMiniPlayerProps {
  messages: PodcastMessages;
  onOpen: () => void;
}

export function PodcastMiniPlayer({ messages, onOpen }: PodcastMiniPlayerProps) {
  const player = usePodcastPlayer();
  const item = player.current;
  if (!item) return null;

  return (
    <section
      aria-label={messages["Now Playing"]}
      className="absolute inset-x-2 bottom-[calc(49px+env(safe-area-inset-bottom)+8px)] z-30 flex h-14 items-center gap-1 rounded-[14px] bg-(--ios-chrome) pr-2 shadow-[0_6px_24px_rgb(0_0_0/0.16),0_0_0_0.5px_var(--ios-separator)] backdrop-blur-2xl backdrop-saturate-180 md:bottom-4 md:left-1/2 md:w-[min(560px,calc(100%-32px))] md:-translate-x-1/2"
    >
      <button
        type="button"
        aria-label={`${messages["Open Now Playing"]}: ${item.episode.title}`}
        className="flex h-full min-w-0 flex-1 items-center gap-3 rounded-[14px] pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)"
        onClick={onOpen}
      >
        <PodcastArtwork
          src={item.podcast.artworkUrl}
          sizes="40px"
          className="w-10 rounded-md shadow-sm"
        />
        <span className="flex min-w-0 flex-col">
          <Text
            as="span"
            numberOfLines={1}
            className="text-[15px] leading-5 font-medium tracking-[-0.23px] text-(--ios-label)"
          >
            {item.episode.title}
          </Text>
          <Text
            as="span"
            numberOfLines={1}
            className="text-[13px] leading-4 text-(--ios-secondary-label)"
          >
            {item.podcast.title}
          </Text>
        </span>
      </button>
      <button
        type="button"
        aria-label={player.isPlaying ? messages.Pause : messages.Play}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-(--ios-label) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:scale-90 active:opacity-60 motion-safe:transition-transform"
        onClick={togglePlayback}
      >
        {player.isPlaying ? (
          <PauseFillIcon className="size-6" />
        ) : (
          <PlayFillIcon className="size-6" />
        )}
      </button>
      <button
        type="button"
        aria-label={messages["Skip Forward 30 Seconds"]}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-(--ios-label) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:scale-90 active:opacity-60 motion-safe:transition-transform"
        onClick={skipForward}
      >
        <GoForwardIcon className="size-7" strokeWidth={2} />
        <span aria-hidden="true" className="absolute pt-0.5 text-[9px] font-bold">
          {skipForwardSeconds}
        </span>
      </button>
    </section>
  );
}
