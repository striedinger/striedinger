"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { Podcast, PodcastShow } from "./types";

import { IosMenu } from "../../../components/ios/ios-menu";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosRevealTransition } from "../../../components/ios/ios-reveal-transition";
import { IosScreen } from "../../../components/ios/ios-screen";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { PodcastHero } from "./podcast-hero";
import { toggleFollowedPodcast, usePodcastLibrary } from "./podcast-library-store";
import { PodcastPageBarButton } from "./podcast-page-bar-button";
import { getTabHref } from "./podcast-route";
import { PodcastShowDescription } from "./podcast-show-description";
import { PodcastShowEpisodes } from "./podcast-show-episodes";
import { PodcastShowPlayButton } from "./podcast-show-play-button";
import { usePodcasts } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";
import { usePodcastMenuSections } from "./use-podcast-menu-sections";

interface PodcastShowPageProps {
  podcast: Podcast;
  /** The show's episodes, streaming from the server. */
  show: Promise<PodcastShow | null>;
}

export function PodcastShowPage({ podcast, show }: PodcastShowPageProps) {
  const { messages } = usePodcasts();
  const iosRouter = useIosRouter();
  const library = usePodcastLibrary();
  const menuSections = usePodcastMenuSections(podcast);
  const isFollowed = library.followed.some(function matchesPodcast(item) {
    return item.id === podcast.id;
  });
  const episodesSkeleton = <EpisodeListSkeleton label={messages["Loading episodes"]} />;

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar
        title={podcast.title}
        titleDisplay="scroll-edge"
        leading={
          <PodcastPageBarButton
            aria-label={messages.Back}
            onClick={function goBack() {
              iosRouter.back(getTabHref("home"));
            }}
          >
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
              sections={menuSections}
            />
          </div>
        }
        accessory={
          <PodcastHero artworkUrl={podcast.artworkUrl}>
            <div className="flex max-w-xl flex-col items-center gap-0.5">
              <Text as="h2" className="text-ios-title2 font-bold text-white">
                {podcast.title}
              </Text>
              <Text className="text-ios-body text-white/75">{podcast.author}</Text>
              <Text className="text-ios-footnote mt-0.5 text-white/60">
                {[podcast.genre, podcast.explicit ? messages.Explicit : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </div>
            <div className="flex w-full max-w-sm items-center gap-2.5">
              <Suspense
                fallback={
                  <PodcastShowPlayButton messages={messages} podcast={podcast} show={null} />
                }
              >
                <PodcastShowPlayButton messages={messages} podcast={podcast} show={show} />
              </Suspense>
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
            <Suspense fallback={null}>
              <PodcastShowDescription messages={messages} show={show} />
            </Suspense>
          </PodcastHero>
        }
      />
      <section
        aria-label={messages.Episodes}
        className="mx-auto flex w-full max-w-4xl flex-col pt-5"
      >
        <Text as="h2" className="text-ios-title2 text-ios-label px-4 pb-1 font-bold">
          {messages.Episodes}
        </Text>
        <Suspense fallback={<IosRevealTransition>{episodesSkeleton}</IosRevealTransition>}>
          <IosRevealTransition>
            <PodcastShowEpisodes show={show} podcast={podcast} />
          </IosRevealTransition>
        </Suspense>
      </section>
    </IosScreen>
  );
}
