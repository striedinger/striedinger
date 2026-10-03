"use client";

import { ArrowUpRightIcon } from "@workspace/icons/arrow-up-right-icon";
import { BookmarkIcon } from "@workspace/icons/bookmark-icon";
import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { ListBulletIcon } from "@workspace/icons/list-bullet-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { PodcastIcon } from "@workspace/icons/podcast-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";

import type { IosMenuAction, IosMenuSection } from "../../../components/ios/ios-menu";
import type { PodcastMessages, PodcastQueueItem } from "./types";

import { setEpisodePlayed, toggleSavedEpisode, usePodcastLibrary } from "./podcast-library-store";
import { enqueueEpisode, playEpisode } from "./podcast-player-store";

interface EpisodeMenuSectionsOptions {
  extraActions?: readonly IosMenuAction[];
  item: PodcastQueueItem;
  messages: PodcastMessages;
  onGoToShow?: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
}

const noExtraActions: readonly IosMenuAction[] = [];

/** Actions for an episode, shared by its More button and its long-press context menu. */
export function useEpisodeMenuSections({
  extraActions = noExtraActions,
  item,
  messages,
  onGoToShow,
  onShare,
}: EpisodeMenuSectionsOptions): IosMenuSection[] {
  const library = usePodcastLibrary();
  const isSaved = library.saved.some(function matchesEpisode(savedItem) {
    return savedItem.episode.id === item.episode.id;
  });
  const isPlayed = library.playedEpisodeIds.has(item.episode.id);

  return [
    {
      id: "playback",
      actions: [
        {
          id: "play",
          label: messages.Play,
          icon: <PlayFillIcon />,
          onSelect: function play() {
            playEpisode(item, { fromStart: isPlayed });
          },
        },
        {
          id: "play-next",
          label: messages["Play Next"],
          icon: <ListBulletIcon />,
          onSelect: function playNext() {
            enqueueEpisode(item, "next");
          },
        },
        {
          id: "play-last",
          label: messages["Play Last"],
          icon: <ListBulletIcon />,
          onSelect: function playLast() {
            enqueueEpisode(item, "last");
          },
        },
      ],
    },
    {
      id: "library",
      actions: [
        {
          id: "save",
          label: isSaved ? messages["Remove from Saved"] : messages["Save Episode"],
          icon: <BookmarkIcon />,
          onSelect: function toggleSaved() {
            toggleSavedEpisode(item);
          },
        },
        {
          id: "played",
          label: isPlayed ? messages["Mark as Unplayed"] : messages["Mark as Played"],
          icon: <CheckCircleIcon />,
          onSelect: function togglePlayed() {
            setEpisodePlayed(item.episode.id, !isPlayed);
          },
        },
        ...extraActions,
      ],
    },
    {
      id: "share",
      actions: [
        ...(onGoToShow
          ? [
              {
                id: "show",
                label: messages["Go to Show"],
                icon: <PodcastIcon />,
                onSelect: function goToShow() {
                  onGoToShow(item);
                },
              },
            ]
          : []),
        {
          id: "share",
          label: messages["Share Episode"],
          icon: <ShareUpIcon />,
          onSelect: function share() {
            onShare(item);
          },
        },
        {
          id: "download",
          label: messages["Download Episode"],
          icon: <ArrowUpRightIcon />,
          onSelect: function openAudio() {
            window.open(item.episode.audioUrl, "_blank", "noopener,noreferrer");
          },
        },
      ],
    },
  ];
}
