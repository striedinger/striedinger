"use client";

import { Text } from "@workspace/ui/components/text";

import type { Podcast } from "./types";

import { PodcastArtwork } from "./podcast-artwork";
import { PodcastLink } from "./podcast-link";
import { useArtworkColor } from "./use-artwork-color";

interface FeaturedPodcastCardProps {
  podcast: Podcast;
  priority: boolean;
}

export function FeaturedPodcastCard({ podcast, priority }: FeaturedPodcastCardProps) {
  const artworkColor = useArtworkColor(podcast.artworkUrl);
  return (
    <li className="w-[min(86vw,420px)] shrink-0 snap-start">
      <PodcastLink
        podcast={podcast}
        className="group flex h-full items-center gap-4 overflow-hidden rounded-ios-xl bg-[#3a3a3c] p-4 text-white transition-[background-color,transform] duration-500 outline-none focus-visible:ring-2 focus-visible:ring-ios-tint active:scale-[0.98] motion-reduce:transition-none"
        style={artworkColor ? { backgroundColor: artworkColor } : undefined}
      >
        <PodcastArtwork
          src={podcast.artworkUrl}
          sizes="120px"
          priority={priority}
          className="w-[120px] rounded-ios-md shadow-ios-floating"
        />
        <span className="flex min-w-0 flex-col gap-1">
          <Text
            as="span"
            className="text-[12px] leading-4 font-semibold tracking-[0.04em] text-white/65 uppercase"
          >
            {podcast.genre}
          </Text>
          <Text as="span" numberOfLines={2} className="text-ios-title3 font-bold text-white">
            {podcast.title}
          </Text>
          <Text as="span" numberOfLines={1} className="text-ios-subheadline text-white/70">
            {podcast.author}
          </Text>
        </span>
      </PodcastLink>
    </li>
  );
}
