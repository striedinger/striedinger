"use client";

import { Text } from "@workspace/ui/components/text";

import type { Podcast } from "./types";

import { IosContextMenu } from "../../../components/ios/ios-context-menu";
import { PodcastArtwork } from "./podcast-artwork";
import { PodcastLink } from "./podcast-link";
import { usePodcastMenuSections } from "./use-podcast-menu-sections";

interface PodcastChartRowProps {
  detail: string;
  podcast: Podcast;
  rank?: number;
}

export function PodcastChartRow({ detail, podcast, rank }: PodcastChartRowProps) {
  const menuSections = usePodcastMenuSections(podcast);

  return (
    <li className="relative">
      <IosContextMenu sections={menuSections}>
        <PodcastLink
          podcast={podcast}
          className="group hover:bg-ios-fill/25 active:bg-ios-fill/50 flex items-center gap-3 py-2 pr-4 transition-colors duration-150 outline-none motion-reduce:transition-none"
        >
          <PodcastArtwork
            src={podcast.artworkUrl}
            sizes="64px"
            className="group-focus-visible:ring-ios-tint w-16 rounded-md group-focus-visible:ring-2"
          />
          {rank === undefined ? null : (
            <Text
              as="span"
              className="text-ios-body text-ios-label w-5 shrink-0 text-center font-semibold tabular-nums"
            >
              {rank}
            </Text>
          )}
          <span className="border-ios-separator flex min-w-0 flex-1 flex-col justify-center self-stretch border-b-[0.5px] group-last:border-transparent">
            <Text as="span" numberOfLines={2} className="text-ios-body text-ios-label">
              {podcast.title}
            </Text>
            <Text
              as="span"
              numberOfLines={1}
              className="text-ios-footnote text-ios-secondary-label"
            >
              {detail}
            </Text>
          </span>
        </PodcastLink>
      </IosContextMenu>
    </li>
  );
}
