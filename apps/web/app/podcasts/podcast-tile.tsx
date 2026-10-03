"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { Podcast } from "./types";

import { PodcastArtwork } from "./podcast-artwork";
import { PodcastLink } from "./podcast-link";

interface PodcastTileProps {
  className?: string;
  detail?: string;
  href: string;
  onOpen: (podcast: Podcast) => void;
  podcast: Podcast;
  priority?: boolean;
  sizes: string;
}

export function PodcastTile({
  className,
  detail,
  href,
  onOpen,
  podcast,
  priority,
  sizes,
}: PodcastTileProps) {
  return (
    <PodcastLink
      href={href}
      className={cn("group flex min-w-0 flex-col gap-1.5 outline-none", className)}
      onOpen={function openPodcast() {
        onOpen(podcast);
      }}
    >
      <PodcastArtwork
        src={podcast.artworkUrl}
        sizes={sizes}
        priority={priority}
        className="w-full rounded-[10px] shadow-[0_2px_8px_rgb(0_0_0/0.08)] transition-transform duration-150 group-focus-visible:ring-2 group-focus-visible:ring-(--ios-tint) group-active:scale-[0.97] motion-reduce:transition-none"
      />
      <span className="flex min-w-0 flex-col">
        <Text
          as="span"
          numberOfLines={1}
          className="text-[15px] leading-5 font-medium tracking-[-0.23px] text-(--ios-label)"
        >
          {podcast.title}
        </Text>
        <Text
          as="span"
          numberOfLines={1}
          className="text-[13px] leading-[18px] text-(--ios-secondary-label)"
        >
          {detail ?? podcast.author}
        </Text>
      </span>
    </PodcastLink>
  );
}
