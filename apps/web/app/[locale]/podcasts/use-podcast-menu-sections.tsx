"use client";

import { ArrowUpRightIcon } from "@workspace/icons/arrow-up-right-icon";
import { CheckIcon } from "@workspace/icons/check-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";

import type { IosMenuSection } from "../../../components/ios/ios-menu";
import type { Podcast, PodcastMessages } from "./types";

import { toggleFollowedPodcast, useFollowedPodcasts } from "./podcast-library-store";

/** Actions for a show, shared by its More button and its long-press context menu. */
export function usePodcastMenuSections(
  podcast: Podcast,
  messages: PodcastMessages,
  onShare: (podcast: Podcast) => void,
): IosMenuSection[] {
  const followed = useFollowedPodcasts();
  const isFollowed = followed.some(function matchesPodcast(item) {
    return item.id === podcast.id;
  });

  return [
    {
      id: "show",
      actions: [
        {
          id: "follow",
          label: isFollowed ? messages["Unfollow Show"] : messages["Follow Show"],
          icon: isFollowed ? <CheckIcon /> : <PlusIcon />,
          onSelect: function toggleFollow() {
            toggleFollowedPodcast(podcast);
          },
        },
        {
          id: "share",
          label: messages["Share Show"],
          icon: <ShareUpIcon />,
          onSelect: function shareShow() {
            onShare(podcast);
          },
        },
        {
          id: "apple",
          label: messages["View on Apple Podcasts"],
          icon: <ArrowUpRightIcon />,
          onSelect: function openApplePodcasts() {
            window.open(podcast.url, "_blank", "noopener,noreferrer");
          },
        },
      ],
    },
  ];
}
