"use client";

import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { lazy, Suspense } from "react";

import type { PodcastQueueItem } from "./types";

import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosScreen } from "../../../components/ios/ios-screen";
import { translationProbe } from "../../../lib/on-device-ai/translation-probe";
import { defineOnDeviceAiProbe, useOnDeviceAi } from "../../../lib/on-device-ai/use-on-device-ai";
import { getEpisodeSummaryOptions } from "./episode-intelligence-options";
import { EpisodeMenu } from "./episode-menu";
import { formatEpisodeDate, formatListeningDuration } from "./podcast-format";
import { PodcastHero } from "./podcast-hero";
import { usePodcastLibrary } from "./podcast-library-store";
import { PodcastLink } from "./podcast-link";
import { PodcastPageBarButton } from "./podcast-page-bar-button";
import { playEpisode, togglePlayback, usePlayingEpisode } from "./podcast-player-store";
import { getShowHref } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";

const EpisodeIntelligence = lazy(function importEpisodeIntelligence() {
  return import("./episode-intelligence").then(function selectEpisodeIntelligence(module) {
    return { default: module.EpisodeIntelligence };
  });
});

interface PodcastEpisodePageProps {
  item: PodcastQueueItem;
}

export function PodcastEpisodePage({ item }: PodcastEpisodePageProps) {
  const { aiLabels, locale, messages, now } = usePodcasts();
  const canSummarize = useOnDeviceAi(
    defineOnDeviceAiProbe("Summarizer", `podcast-episode:${locale}`, function checkSummaries() {
      return Summarizer.availability(getEpisodeSummaryOptions(locale));
    }),
  );
  const canTranslate = useOnDeviceAi(translationProbe);
  const iosRouter = useIosRouter();
  const library = usePodcastLibrary();
  const playingEpisode = usePlayingEpisode();
  const isCurrent = playingEpisode.currentEpisodeId === item.episode.id;
  const isPlaying = isCurrent && playingEpisode.isPlaying;
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
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar
        title={item.episode.title}
        titleDisplay="scroll-edge"
        leading={
          <PodcastPageBarButton
            aria-label={`${messages.Back}: ${item.podcast.title}`}
            onClick={function goBack() {
              iosRouter.back(getShowHref(item.podcast));
            }}
          >
            <ChevronLeftIcon strokeWidth={2.8} />
          </PodcastPageBarButton>
        }
        trailing={
          <EpisodeMenu
            item={item}
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
              <Text className="text-ios-footnote font-semibold tracking-[0.04em] text-white/65 uppercase">
                {formatEpisodeDate(item.episode.publishedAt, locale, now)}
              </Text>
              <Text as="h2" className="text-ios-title2 font-bold text-white">
                {item.episode.title}
              </Text>
              <PodcastLink
                podcast={item.podcast}
                className="text-ios-body text-white/75 underline-offset-2 outline-none hover:underline focus-visible:underline"
              >
                {item.podcast.title}
              </PodcastLink>
            </div>
            <button
              type="button"
              className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-ios-md bg-white text-ios-body font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70"
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
              <Text className="text-ios-footnote text-white/65 tabular-nums">{timeLabel}</Text>
            ) : null}
          </PodcastHero>
        }
      />
      <div className="mx-auto w-full max-w-3xl px-5 pt-5">
        <Text className="text-ios-body leading-[24px] whitespace-pre-line text-ios-label">
          {item.episode.description || messages["This episode is no longer available."]}
        </Text>
        {item.episode.description && (canSummarize || canTranslate) ? (
          <Suspense fallback={null}>
            <EpisodeIntelligence
              aiLabels={aiLabels}
              canSummarize={canSummarize}
              canTranslate={canTranslate}
              description={item.episode.description}
              locale={locale}
              messages={messages}
            />
          </Suspense>
        ) : null}
      </div>
    </IosScreen>
  );
}
