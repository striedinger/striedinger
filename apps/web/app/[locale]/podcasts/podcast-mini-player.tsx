"use client";

import { GoForwardIcon } from "@workspace/icons/go-forward-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { PodcastMessages } from "./types";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { PodcastArtwork } from "./podcast-artwork";
import {
  skipForward,
  skipForwardSeconds,
  togglePlayback,
  usePodcastPlayer,
} from "./podcast-player-store";

interface PodcastMiniPlayerProps {
  isTabBarMinimized: boolean;
  messages: PodcastMessages;
  onOpen: () => void;
}

export function PodcastMiniPlayer({ isTabBarMinimized, messages, onOpen }: PodcastMiniPlayerProps) {
  const player = usePodcastPlayer();
  const item = player.current;
  if (!item) return null;

  return (
    <section
      aria-label={messages["Now Playing"]}
      className={cn(
        "absolute right-4 z-30 flex animate-in items-center gap-1 rounded-full pr-2 transition-[left,bottom,height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] [view-transition-class:ios-anchored] [view-transition-name:podcasts-mini-player] fade-in slide-in-from-bottom-4 motion-reduce:animate-none motion-reduce:transition-none md:bottom-4 md:left-[calc(50%+146px)] md:h-[52px] md:w-[min(560px,calc(100%-324px))] md:-translate-x-1/2",
        isTabBarMinimized
          ? "bottom-[max(env(safe-area-inset-bottom),14px)] left-[90px] h-[62px]"
          : "bottom-[calc(max(env(safe-area-inset-bottom),14px)+72px)] left-4 h-[52px]",
        iosGlassClassName,
      )}
    >
      <button
        type="button"
        aria-label={`${messages["Open Now Playing"]}: ${item.episode.title}`}
        className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-full pl-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)"
        onClick={onOpen}
      >
        <PodcastArtwork
          src={item.podcast.artworkUrl}
          sizes="32px"
          className="w-8 shrink-0 rounded-[7px]"
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
