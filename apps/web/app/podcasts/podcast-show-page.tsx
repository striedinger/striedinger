"use client";

import { ArrowUpRightIcon } from "@workspace/icons/arrow-up-right-icon";
import { CheckIcon } from "@workspace/icons/check-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { Podcast, PodcastEpisode, PodcastMessages, PodcastQueueItem } from "./types";

import { IosMenu } from "../../components/ios/ios-menu";
import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { EpisodeList } from "./episode-list";
import { PodcastHero } from "./podcast-hero";
import { toggleFollowedPodcast, usePodcastLibrary } from "./podcast-library-store";
import { PodcastPageBarButton } from "./podcast-page-bar-button";
import { playEpisode } from "./podcast-player-store";

interface PodcastShowPageProps {
  backLabel: string;
  episodes: readonly PodcastEpisode[] | null;
  getEpisodeHref: (item: PodcastQueueItem) => string;
  isLoading: boolean;
  locale: string;
  messages: PodcastMessages;
  now: number;
  onBack: () => void;
  onOpenEpisode: (item: PodcastQueueItem) => void;
  onShare: (item: PodcastQueueItem) => void;
  onShareShow: (podcast: Podcast) => void;
  podcast: Podcast;
}

export function PodcastShowPage({
  backLabel,
  episodes,
  getEpisodeHref,
  isLoading,
  locale,
  messages,
  now,
  onBack,
  onOpenEpisode,
  onShare,
  onShareShow,
  podcast,
}: PodcastShowPageProps) {
  const library = usePodcastLibrary();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const isFollowed = library.followed.some(function matchesPodcast(item) {
    return item.id === podcast.id;
  });
  const items: PodcastQueueItem[] = (episodes ?? []).map(function createItem(episode) {
    return { podcast, episode };
  });
  const resumeItem = library.progress.find(function belongsToShow(item) {
    return item.podcast.id === podcast.id;
  });
  const latestItem = items[0];
  const description = latestItem?.episode.description ?? "";

  return (
    <div data-ios-scroll className="flex h-full flex-col overflow-y-auto overscroll-contain pb-40">
      <IosNavigationBar
        title={podcast.title}
        titleDisplay="scroll-edge"
        leading={
          <PodcastPageBarButton aria-label={`${messages.Back}: ${backLabel}`} onClick={onBack}>
            <ChevronLeftIcon strokeWidth={2.8} />
          </PodcastPageBarButton>
        }
        trailing={
          <div className="flex items-center gap-2">
            <PodcastPageBarButton
              aria-pressed={isFollowed}
              aria-label={isFollowed ? messages["Unfollow Show"] : messages["Follow Show"]}
              onClick={function toggleFollow() {
                toggleFollowedPodcast(podcast);
              }}
            >
              {isFollowed ? <CheckIcon strokeWidth={3} /> : <PlusIcon strokeWidth={3} />}
            </PodcastPageBarButton>
            <IosMenu
              trigger={
                <PodcastPageBarButton aria-label={messages.More}>
                  <EllipsisIcon />
                </PodcastPageBarButton>
              }
              sections={[
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
                        onShareShow(podcast);
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
              ]}
            />
          </div>
        }
        accessory={
          <PodcastHero artworkUrl={podcast.artworkUrl}>
            <div className="flex max-w-xl flex-col items-center gap-0.5">
              <Text
                as="h2"
                className="text-[22px] leading-7 font-bold tracking-[0.35px] text-white"
              >
                {podcast.title}
              </Text>
              <Text className="text-[17px] leading-[22px] text-white/75">{podcast.author}</Text>
              <Text className="mt-0.5 text-[13px] leading-[18px] text-white/60">
                {[podcast.genre, podcast.explicit ? messages.Explicit : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </div>
            <div className="flex w-full max-w-sm items-center gap-2.5">
              <button
                type="button"
                disabled={!latestItem && !resumeItem}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-white text-[17px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70 disabled:opacity-50"
                onClick={function playShow() {
                  if (resumeItem)
                    playEpisode({ podcast: resumeItem.podcast, episode: resumeItem.episode });
                  else if (latestItem) playEpisode(latestItem);
                }}
              >
                <PlayFillIcon className="size-4" />
                {resumeItem ? messages.Resume : messages["Latest Episode"]}
              </button>
              <button
                type="button"
                aria-pressed={isFollowed}
                className="flex h-12 items-center justify-center gap-1.5 rounded-[12px] bg-white/20 px-4 text-[17px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70"
                onClick={function toggleFollow() {
                  toggleFollowedPodcast(podcast);
                }}
              >
                {isFollowed ? (
                  <CheckIcon className="size-4" strokeWidth={3} />
                ) : (
                  <PlusIcon className="size-4" strokeWidth={3} />
                )}
                {isFollowed ? messages.Following : messages.Follow}
              </button>
            </div>
            {description ? (
              <button
                type="button"
                aria-expanded={isDescriptionExpanded}
                className="max-w-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                onClick={function toggleDescription() {
                  setIsDescriptionExpanded(!isDescriptionExpanded);
                }}
              >
                <Text
                  as="span"
                  numberOfLines={isDescriptionExpanded ? undefined : 3}
                  className="text-[15px] leading-5 tracking-[-0.23px] text-white/80"
                >
                  {description}
                </Text>
                {isDescriptionExpanded ? null : (
                  <Text as="span" className="text-[13px] font-semibold text-white uppercase">
                    {messages["Show More"]}
                  </Text>
                )}
              </button>
            ) : null}
          </PodcastHero>
        }
      />
      <section
        aria-label={messages.Episodes}
        className="mx-auto flex w-full max-w-4xl flex-col pt-5"
      >
        <Text
          as="h2"
          className="px-4 pb-1 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
        >
          {messages.Episodes}
        </Text>
        {items.length > 0 ? (
          <EpisodeList
            items={items}
            label={messages.Episodes}
            getHref={getEpisodeHref}
            locale={locale}
            messages={messages}
            now={now}
            onOpen={onOpenEpisode}
            onShare={onShare}
          />
        ) : isLoading ? (
          <div
            role="status"
            aria-label={messages["Loading episodes"]}
            className="flex flex-col gap-6 px-4 pt-4"
          >
            {[0, 1, 2, 3].map(function renderPlaceholder(placeholder) {
              return (
                <div
                  key={placeholder}
                  className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none"
                >
                  <span className="h-3 w-16 rounded bg-(--ios-tertiary-fill)" />
                  <span className="h-4 w-4/5 rounded bg-(--ios-tertiary-fill)" />
                  <span className="h-3 w-full rounded bg-(--ios-tertiary-fill)" />
                  <span className="h-7 w-24 rounded-full bg-(--ios-tertiary-fill)" />
                </div>
              );
            })}
          </div>
        ) : (
          <Text className="px-4 pt-4 text-[15px] text-(--ios-secondary-label)">
            {messages["Episodes are unavailable right now. Please try another show."]}
          </Text>
        )}
      </section>
    </div>
  );
}
