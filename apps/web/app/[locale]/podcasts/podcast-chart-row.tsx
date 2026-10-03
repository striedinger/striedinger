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
          className="group flex items-center gap-3 py-2 pr-4 transition-colors duration-150 outline-none hover:bg-(--ios-fill)/25 active:bg-(--ios-fill)/50 motion-reduce:transition-none"
        >
          <PodcastArtwork
            src={podcast.artworkUrl}
            sizes="64px"
            className="w-16 rounded-md group-focus-visible:ring-2 group-focus-visible:ring-(--ios-tint)"
          />
          {rank === undefined ? null : (
            <Text
              as="span"
              className="w-5 shrink-0 text-center text-[17px] leading-[22px] font-semibold text-(--ios-label) tabular-nums"
            >
              {rank}
            </Text>
          )}
          <span className="flex min-w-0 flex-1 flex-col justify-center self-stretch border-b-[0.5px] border-(--ios-separator) group-last:border-transparent">
            <Text
              as="span"
              numberOfLines={2}
              className="text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-label)"
            >
              {podcast.title}
            </Text>
            <Text
              as="span"
              numberOfLines={1}
              className="text-[13px] leading-[18px] text-(--ios-secondary-label)"
            >
              {detail}
            </Text>
          </span>
        </PodcastLink>
      </IosContextMenu>
    </li>
  );
}
