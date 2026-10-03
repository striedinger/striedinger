"use client";

import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { Text } from "@workspace/ui/components/text";

import type { IosMenuAction } from "../../../components/ios/ios-menu";
import type { PodcastMessages, PodcastProgress, PodcastQueueItem } from "./types";

import { IosContextMenu } from "../../../components/ios/ios-context-menu";
import { IosMenu } from "../../../components/ios/ios-menu";
import { EpisodePlayButton } from "./episode-play-button";
import { formatEpisodeDate } from "./podcast-format";
import { PodcastLink } from "./podcast-link";
import { useEpisodeMenuSections } from "./use-episode-menu-sections";

interface EpisodeRowProps {
  extraActions?: readonly IosMenuAction[];
  href: string;
  isCurrent: boolean;
  isPlayed: boolean;
  isPlaying: boolean;
  item: PodcastQueueItem;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onGoToShow?: (item: PodcastQueueItem) => void;
  onOpen: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  progress: PodcastProgress | undefined;
  showsPodcastTitle?: boolean;
}

export function EpisodeRow({
  extraActions,
  href,
  isCurrent,
  isPlayed,
  isPlaying,
  item,
  locale,
  messages,
  now,
  onGoToShow,
  onOpen,
  onShare,
  progress,
  showsPodcastTitle = false,
}: EpisodeRowProps) {
  const menuSections = useEpisodeMenuSections({
    extraActions,
    item,
    messages,
    onGoToShow,
    onShare,
  });

  return (
    <li className="relative transition-colors duration-150 [contain-intrinsic-size:auto_180px] [content-visibility:auto] not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-0 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-(--ios-separator) has-[a:active]:bg-(--ios-fill)/40 has-[a:hover]:bg-(--ios-fill)/20 motion-reduce:transition-none">
      <IosContextMenu sections={menuSections} className="relative flex flex-col gap-1 py-3.5 pr-4">
        <Text
          as="span"
          className="flex items-center gap-1.5 text-[12px] leading-4 font-semibold tracking-[0.02em] text-(--ios-secondary-label) uppercase"
        >
          {showsPodcastTitle ? (
            <span className="truncate">{item.podcast.title}</span>
          ) : (
            formatEpisodeDate(item.episode.publishedAt, locale, now)
          )}
          {item.podcast.explicit ? (
            <span
              aria-label={messages.Explicit}
              className="inline-flex size-3.5 items-center justify-center rounded-[3px] bg-(--ios-secondary-label) text-[9px] font-bold text-(--ios-background)"
            >
              E
            </span>
          ) : null}
        </Text>
        <PodcastLink
          href={href}
          className="outline-none after:absolute after:inset-0 focus-visible:underline"
          onOpen={function openEpisode() {
            onOpen(item);
          }}
        >
          <Text
            as="span"
            numberOfLines={2}
            className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-(--ios-label)"
          >
            {item.episode.title}
          </Text>
        </PodcastLink>
        {item.episode.description ? (
          <Text
            numberOfLines={3}
            className="text-[15px] leading-5 tracking-[-0.23px] text-(--ios-secondary-label)"
          >
            {item.episode.description}
          </Text>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <EpisodePlayButton
            item={item}
            isCurrent={isCurrent}
            isPlayed={isPlayed}
            isPlaying={isPlaying}
            locale={locale}
            messages={messages}
            progress={progress}
          />
          <IosMenu
            sections={menuSections}
            trigger={
              <button
                type="button"
                aria-label={`${messages.More}: ${item.episode.title}`}
                className="relative z-10 -mr-2 flex size-9 items-center justify-center rounded-full text-(--ios-tint) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:opacity-50"
              >
                <EllipsisIcon className="size-5" />
              </button>
            }
          />
        </div>
      </IosContextMenu>
    </li>
  );
}
