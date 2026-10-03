"use client";

import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { Podcast, PodcastMessages, PodcastQueueItem } from "./types";

import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { EpisodeMenu } from "./episode-menu";
import { formatEpisodeDate, formatListeningDuration } from "./podcast-format";
import { PodcastHero } from "./podcast-hero";
import { usePodcastLibrary } from "./podcast-library-store";
import { PodcastLink } from "./podcast-link";
import { PodcastPageBarButton } from "./podcast-page-bar-button";
import { playEpisode, togglePlayback, usePodcastPlayer } from "./podcast-player-store";

export interface PodcastEpisodePageProps {
  item: PodcastQueueItem;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onBack: () => void;
  onGoToShow: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  getShowHref: (podcast: Podcast) => string;
}

export function PodcastEpisodePage({
  item,
  locale,
  messages,
  now,
  onBack,
  onGoToShow,
  onShare,
  getShowHref,
}: PodcastEpisodePageProps) {
  const library = usePodcastLibrary();
  const player = usePodcastPlayer();
  const isCurrent = player.current?.episode.id === item.episode.id;
  const isPlaying = isCurrent && player.isPlaying;
  const isPlayed = library.playedEpisodeIds.has(item.episode.id);
  const progress = library.progress.find(function matchesEpisode(progressItem) {
    return progressItem.episode.id === item.episode.id;
  });
  const durationSeconds = progress?.durationSeconds || item.episode.durationMilliseconds / 1_000;
  const remainingSeconds = progress ? Math.max(0, durationSeconds - progress.positionSeconds) : 0;
  const playLabel = isPlaying ? messages.Pause : progress ? messages.Resume : messages.Play;
  const timeLabel = isPlayed
    ? messages.Played
    : progress
      ? messages["{time} left"].replace("{time}", formatListeningDuration(remainingSeconds, locale))
      : durationSeconds > 0
        ? formatListeningDuration(durationSeconds, locale)
        : "";

  return (
    <div data-ios-scroll className="flex h-full flex-col overflow-y-auto overscroll-contain pb-40">
      <IosNavigationBar
        title={item.episode.title}
        titleDisplay="scroll-edge"
        leading={
          <PodcastPageBarButton
            aria-label={`${messages.Back}: ${item.podcast.title}`}
            onClick={onBack}
          >
            <ChevronLeftIcon strokeWidth={2.8} />
          </PodcastPageBarButton>
        }
        trailing={
          <EpisodeMenu
            item={item}
            messages={messages}
            onGoToShow={onGoToShow}
            onShare={onShare}
            trigger={
              <PodcastPageBarButton aria-label={messages.More}>
                <EllipsisIcon />
              </PodcastPageBarButton>
            }
          />
        }
        accessory={
          <PodcastHero artworkUrl={item.podcast.artworkUrl}>
            <div className="flex max-w-xl flex-col items-center gap-1">
              <Text className="text-[13px] leading-[18px] font-semibold tracking-[0.04em] text-white/65 uppercase">
                {formatEpisodeDate(item.episode.publishedAt, locale, now)}
              </Text>
              <Text
                as="h2"
                className="text-[22px] leading-7 font-bold tracking-[0.35px] text-white"
              >
                {item.episode.title}
              </Text>
              <PodcastLink
                href={getShowHref(item.podcast)}
                className="text-[17px] leading-[22px] text-white/75 underline-offset-2 outline-none hover:underline focus-visible:underline"
                onOpen={function openShow() {
                  onGoToShow(item);
                }}
              >
                {item.podcast.title}
              </PodcastLink>
            </div>
            <button
              type="button"
              className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-[12px] bg-white text-[17px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70"
              onClick={function playOrPause() {
                if (isCurrent) togglePlayback();
                else playEpisode(item, { fromStart: isPlayed });
              }}
            >
              {isPlaying ? (
                <PauseFillIcon className="size-4" />
              ) : (
                <PlayFillIcon className="size-4" />
              )}
              {playLabel}
            </button>
            {timeLabel ? (
              <Text className="text-[13px] text-white/65 tabular-nums">{timeLabel}</Text>
            ) : null}
          </PodcastHero>
        }
      />
      <div className="mx-auto w-full max-w-3xl px-5 pt-5">
        <Text className="text-[17px] leading-[24px] tracking-[-0.43px] whitespace-pre-line text-(--ios-label)">
          {item.episode.description || messages["This episode is no longer available."]}
        </Text>
      </div>
    </div>
  );
}
