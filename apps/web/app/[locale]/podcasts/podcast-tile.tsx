"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { Podcast } from "./types";

import { IosContextMenu } from "../../../components/ios/ios-context-menu";
import { PodcastArtwork } from "./podcast-artwork";
import { PodcastLink } from "./podcast-link";
import { usePodcastMenuSections } from "./use-podcast-menu-sections";

interface PodcastTileProps {
  className?: string;
  detail?: string;
  podcast: Podcast;
  priority?: boolean;
  sizes: string;
}

export function PodcastTile({ className, detail, podcast, priority, sizes }: PodcastTileProps) {
  const menuSections = usePodcastMenuSections(podcast);

  return (
    <IosContextMenu sections={menuSections} className="min-w-0">
      <PodcastLink
        podcast={podcast}
        className={cn("group flex min-w-0 flex-col gap-1.5 outline-none", className)}
      >
        <PodcastArtwork
          src={podcast.artworkUrl}
          sizes={sizes}
          priority={priority}
          className="group-focus-visible:ring-ios-tint w-full rounded-[10px] shadow-[0_2px_8px_rgb(0_0_0/0.08)] transition-transform duration-150 group-focus-visible:ring-2 group-active:scale-[0.97] motion-reduce:transition-none"
        />
        <span className="flex min-w-0 flex-col">
          <Text
            as="span"
            numberOfLines={1}
            className="text-ios-subheadline text-ios-label font-medium"
          >
            {podcast.title}
          </Text>
          <Text as="span" numberOfLines={1} className="text-ios-footnote text-ios-secondary-label">
            {detail ?? podcast.author}
          </Text>
        </span>
      </PodcastLink>
    </IosContextMenu>
  );
}
