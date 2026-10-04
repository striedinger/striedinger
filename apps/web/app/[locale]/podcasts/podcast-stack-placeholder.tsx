"use client";

import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { Text } from "@workspace/ui/components/text";

import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosScreen } from "../../../components/ios/ios-screen";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { PodcastPageBarButton } from "./podcast-page-bar-button";
import { getTabHref } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastStackPlaceholderProps {
  /** Explains why the screen has nothing to show; without one it shows loading placeholders. */
  message?: string;
}

/** A pushed show or episode screen whose details are still loading or could not be found. */
export function PodcastStackPlaceholder({ message }: PodcastStackPlaceholderProps) {
  const { messages } = usePodcasts();
  const iosRouter = useIosRouter();

  return (
    <IosScreen aria-busy={message ? undefined : true} className={podcastsScreenClassName}>
      <IosNavigationBar
        title={messages.Episodes}
        titleDisplay="hidden"
        titleElement="h2"
        leading={
          <PodcastPageBarButton
            aria-label={messages.Back}
            className="bg-ios-fill text-ios-label"
            onClick={function goBack() {
              iosRouter.back(getTabHref("home"));
            }}
          >
            <ChevronLeftIcon strokeWidth={2.8} />
          </PodcastPageBarButton>
        }
      />
      {message ? (
        <Text className="px-8 pt-[20vh] text-center text-ios-body text-ios-secondary-label">
          {message}
        </Text>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-6">
            <IosSkeleton className="size-50 rounded-xl md:size-60" />
            <IosSkeleton className="mt-2 h-6 w-48" />
            <IosSkeleton className="h-4 w-32" />
            <IosSkeleton className="mt-2 h-12 w-full max-w-sm rounded-ios-md" />
          </div>
          <EpisodeListSkeleton label={messages["Loading episodes"]} />
        </>
      )}
    </IosScreen>
  );
}
