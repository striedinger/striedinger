"use client";

import type { IosMenuAction, IosMenuTrigger } from "../../../components/ios/ios-menu";
import type { PodcastQueueItem } from "./types";

import { IosMenu } from "../../../components/ios/ios-menu";
import { useEpisodeMenuSections } from "./use-episode-menu-sections";

interface EpisodeMenuProps {
  extraActions?: readonly IosMenuAction[];
  item: PodcastQueueItem;
  showsGoToShow?: boolean;
  trigger: IosMenuTrigger;
}

export function EpisodeMenu({ trigger, ...options }: EpisodeMenuProps) {
  return <IosMenu trigger={trigger} sections={useEpisodeMenuSections(options)} />;
}
