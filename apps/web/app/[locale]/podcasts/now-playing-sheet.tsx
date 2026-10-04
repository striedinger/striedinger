"use client";

import { Drawer, type DrawerRootChangeEventDetails } from "@base-ui/react/drawer";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { ListBulletIcon } from "@workspace/icons/list-bullet-icon";
import { MoonIcon } from "@workspace/icons/moon-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { SpeakerIcon } from "@workspace/icons/speaker-icon";
import { SpeakerWaveIcon } from "@workspace/icons/speaker-wave-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

import { IosMenu } from "../../../components/ios/ios-menu";
import { useIosPortalContainer } from "../../../components/ios/ios-portal-container";
import { useOpenAfterMount } from "../../../components/use-open-after-mount";
import { getNumberFormat } from "../../../lib/intl-cache";
import { EpisodeMenu } from "./episode-menu";
import { NowPlayingQueue } from "./now-playing-queue";
import { NowPlayingScrubber } from "./now-playing-scrubber";
import { NowPlayingSkipButton } from "./now-playing-skip-button";
import { PodcastArtwork } from "./podcast-artwork";
import { formatEpisodeDate, formatPlaybackRate } from "./podcast-format";
import {
  playbackRates,
  setPlaybackRate,
  setSleepTimer,
  setVolume,
  skipBackward,
  skipBackwardSeconds,
  skipForward,
  skipForwardSeconds,
  togglePlayback,
  usePodcastPlayer,
} from "./podcast-player-store";
import { PodcastSlider } from "./podcast-slider";
import { usePodcasts } from "./podcasts-context";
import { useArtworkColor } from "./use-artwork-color";

interface NowPlayingSheetProps {
  onOpenChange: (open: boolean, details: DrawerRootChangeEventDetails) => void;
  open: boolean;
}

const sleepTimerMinutes = [5, 10, 15, 30, 45, 60] as const;

export function NowPlayingSheet({ onOpenChange, open }: NowPlayingSheetProps) {
  const isOpen = useOpenAfterMount(open);
  const { goToShow, locale, messages, now } = usePodcasts();
  const portalContainer = useIosPortalContainer();
  const player = usePodcastPlayer();
  const [showsQueue, setShowsQueue] = useState(false);
  const item = player.current;
  const artworkColor = useArtworkColor(item?.podcast.artworkUrl ?? null);
  const minuteFormatter = getNumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "long",
  });
  const isSleepTimerActive = player.sleepTimer !== null;

  return (
    <Drawer.Root open={isOpen && item !== null} onOpenChange={onOpenChange}>
      <Drawer.Portal container={portalContainer}>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black opacity-[calc(0.4*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-ios data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-40 flex items-end justify-center">
          <Drawer.Popup
            className="flex h-[calc(100dvh-env(safe-area-inset-top)-10px)] w-full [transform:translateY(var(--drawer-swipe-movement-y))] flex-col overflow-hidden rounded-t-ios-sheet bg-ios-gray5-dark text-white shadow-ios-sheet transition-[transform,background-color] duration-450 ease-ios outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none md:mb-3 md:h-[min(880px,calc(100dvh-24px))] md:max-w-120 md:rounded-ios-sheet"
            style={artworkColor ? { backgroundColor: artworkColor } : undefined}
          >
            {item ? (
              <div className="flex min-h-0 flex-1 flex-col bg-linear-to-b from-white/8 to-black/30 px-7 pt-2 pb-safe-min-6">
                <Drawer.Close
                  aria-label={messages["Close Now Playing"]}
                  className="mx-auto flex h-6 w-16 shrink-0 items-start justify-center outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span aria-hidden="true" className="mt-1 h-1.25 w-9 rounded-full bg-white/40" />
                </Drawer.Close>
                <Drawer.Title className="sr-only">{messages["Now Playing"]}</Drawer.Title>
                <Drawer.Description className="sr-only">{item.episode.title}</Drawer.Description>
                <div className="@container-size flex min-h-0 flex-1 flex-col justify-center py-4">
                  {showsQueue ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-5">
                      <div className="flex items-center gap-3">
                        <PodcastArtwork
                          src={item.podcast.artworkUrl}
                          sizes="64px"
                          className="w-16 rounded-md"
                        />
                        <span className="flex min-w-0 flex-col">
                          <Text
                            as="span"
                            numberOfLines={1}
                            className="text-ios-subheadline font-semibold text-white"
                          >
                            {item.episode.title}
                          </Text>
                          <Text
                            as="span"
                            numberOfLines={1}
                            className="text-ios-footnote text-white/60"
                          >
                            {item.podcast.title}
                          </Text>
                        </span>
                      </div>
                      <NowPlayingQueue messages={messages} queue={player.queue} />
                    </div>
                  ) : (
                    <PodcastArtwork
                      src={item.podcast.artworkUrl}
                      sizes="(min-width: 768px) 420px, 90vw"
                      priority
                      className={cn(
                        "mx-auto w-[min(100cqw,100cqh)] max-w-105 shrink-0 rounded-ios-md shadow-ios-overlay transition-transform duration-500 ease-ios-bounce motion-reduce:transition-none",
                        player.isPlaying ? "scale-100" : "scale-[0.82]",
                      )}
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Text className="text-ios-footnote font-semibold tracking-[0.04em] text-white/55 uppercase">
                        {formatEpisodeDate(item.episode.publishedAt, locale, now)}
                      </Text>
                      <Text numberOfLines={2} className="text-ios-title3 font-semibold text-white">
                        {item.episode.title}
                      </Text>
                      <button
                        type="button"
                        className="self-start text-left text-ios-body text-white/60 outline-none hover:underline focus-visible:underline"
                        onClick={function openShow() {
                          goToShow(item);
                        }}
                      >
                        {item.podcast.title}
                      </button>
                    </div>
                    <EpisodeMenu
                      item={item}
                      trigger={
                        <button
                          type="button"
                          aria-label={messages.More}
                          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:opacity-60"
                        >
                          <EllipsisIcon className="size-4" />
                        </button>
                      }
                    />
                  </div>
                  <NowPlayingScrubber duration={player.duration} messages={messages} />
                  {player.hasError ? (
                    <Text
                      role="alert"
                      className="-mt-2 text-center text-ios-footnote text-white/75"
                    >
                      {messages["This episode can’t be played right now."]}
                    </Text>
                  ) : null}
                  <div className="flex items-center justify-center gap-9">
                    <NowPlayingSkipButton
                      direction="backward"
                      seconds={skipBackwardSeconds}
                      label={messages["Skip Back 15 Seconds"]}
                      onSkip={skipBackward}
                    />
                    <button
                      type="button"
                      aria-label={player.isPlaying ? messages.Pause : messages.Play}
                      className="flex size-18 items-center justify-center rounded-full text-white outline-none focus-visible:bg-white/10 active:scale-90 active:opacity-60 motion-safe:transition-transform"
                      onClick={togglePlayback}
                    >
                      {player.isPlaying ? (
                        <PauseFillIcon className="size-12" />
                      ) : (
                        <PlayFillIcon className="size-12" />
                      )}
                    </button>
                    <NowPlayingSkipButton
                      direction="forward"
                      seconds={skipForwardSeconds}
                      label={messages["Skip Forward 30 Seconds"]}
                      onSkip={skipForward}
                    />
                  </div>
                  <div className="hidden items-center gap-3 text-white/60 [@media(hover:hover)]:flex">
                    <SpeakerIcon className="size-4 shrink-0" />
                    <PodcastSlider
                      className="flex-1"
                      label={messages.Volume}
                      max={1}
                      value={player.volume}
                      valueText={`${Math.round(player.volume * 100)}%`}
                      keyboardStep={0.1}
                      onChange={setVolume}
                      onCommit={setVolume}
                    />
                    <SpeakerWaveIcon className="size-5 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between">
                    <IosMenu
                      side="top"
                      align="start"
                      trigger={
                        <button
                          type="button"
                          aria-label={`${messages["Playback Speed"]}: ${formatPlaybackRate(player.playbackRate, locale)}`}
                          className="flex h-8 min-w-11 items-center justify-center rounded-full px-2 text-ios-subheadline font-semibold text-white/80 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:opacity-60"
                        >
                          {formatPlaybackRate(player.playbackRate, locale)}
                        </button>
                      }
                      sections={[
                        {
                          id: "rates",
                          title: messages["Playback Speed"],
                          actions: playbackRates.map(function createRateAction(rate) {
                            return {
                              id: String(rate),
                              label: formatPlaybackRate(rate, locale),
                              checked: player.playbackRate === rate,
                              onSelect: function selectRate() {
                                setPlaybackRate(rate);
                              },
                            };
                          }),
                        },
                      ]}
                    />
                    <IosMenu
                      side="top"
                      align="center"
                      trigger={
                        <button
                          type="button"
                          aria-label={messages["Sleep Timer"]}
                          aria-pressed={isSleepTimerActive}
                          className="flex size-11 items-center justify-center rounded-full text-white/80 outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:opacity-60 aria-pressed:bg-white aria-pressed:text-black"
                        >
                          <MoonIcon className="size-5.5" />
                        </button>
                      }
                      sections={[
                        {
                          id: "sleep",
                          title: messages["Sleep Timer"],
                          actions: [
                            {
                              id: "off",
                              label: messages.Off,
                              checked: player.sleepTimer === null,
                              onSelect: turnOffSleepTimer,
                            },
                            ...sleepTimerMinutes.map(function createSleepAction(minutes) {
                              return {
                                id: String(minutes),
                                label: minuteFormatter.format(minutes),
                                checked:
                                  player.sleepTimer?.kind === "time" &&
                                  player.sleepTimer.minutes === minutes,
                                onSelect: function startSleepTimer() {
                                  setSleepTimer(minutes);
                                },
                              };
                            }),
                            {
                              id: "episode",
                              label: messages["When Current Episode Ends"],
                              checked: player.sleepTimer?.kind === "episode",
                              onSelect: sleepAfterEpisode,
                            },
                          ],
                        },
                      ]}
                    />
                    <button
                      type="button"
                      aria-label={messages["Up Next"]}
                      aria-pressed={showsQueue}
                      className="flex size-11 items-center justify-center rounded-full text-white/80 outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:opacity-60 aria-pressed:bg-white aria-pressed:text-black"
                      onClick={function toggleQueue() {
                        setShowsQueue(!showsQueue);
                      }}
                    >
                      <ListBulletIcon className="size-5.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function turnOffSleepTimer() {
  setSleepTimer(null);
}

function sleepAfterEpisode() {
  setSleepTimer("episode");
}
