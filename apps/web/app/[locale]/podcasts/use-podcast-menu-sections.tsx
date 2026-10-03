"use client";

import { ArrowUpRightIcon } from "@workspace/icons/arrow-up-right-icon";
import { CheckIcon } from "@workspace/icons/check-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";

import type { IosMenuSection } from "../../../components/ios/ios-menu";
import type { Podcast } from "./types";

import { toggleFollowedPodcast, useFollowedPodcasts } from "./podcast-library-store";
import { usePodcasts } from "./podcasts-context";

/** Actions for a show, shared by its More button and its long-press context menu. */
export function usePodcastMenuSections(podcast: Podcast): IosMenuSection[] {
  const { messages, shareShow } = usePodcasts();
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
          onSelect: function share() {
            shareShow(podcast);
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
