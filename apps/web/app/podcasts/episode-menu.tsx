"use client";

import type { IosMenuAction, IosMenuTrigger } from "../../components/ios/ios-menu";
import type { PodcastMessages, PodcastQueueItem } from "./types";

import { IosMenu } from "../../components/ios/ios-menu";
import { useEpisodeMenuSections } from "./use-episode-menu-sections";

interface EpisodeMenuProps {
  extraActions?: readonly IosMenuAction[];
  item: PodcastQueueItem;
  messages: PodcastMessages;
  onGoToShow?: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  trigger: IosMenuTrigger;
}

export function EpisodeMenu({ trigger, ...options }: EpisodeMenuProps) {
  return <IosMenu trigger={trigger} sections={useEpisodeMenuSections(options)} />;
}
