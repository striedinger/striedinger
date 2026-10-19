"use client";

import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { Suspense } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { useIosRouter } from "../../../components/ios/ios-navigation-context";
import { IosScreen } from "../../../components/ios/ios-screen";
import { EpisodeListSkeleton } from "./episode-list-skeleton";
import { getTabHref, type LibraryView } from "./podcast-route";
import { usePodcasts } from "./podcasts-context";
import { PodcastsLibraryContent } from "./podcasts-library-content";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastsLibraryScreenProps {
  view: LibraryView | null;
}

export function PodcastsLibraryScreen({ view }: PodcastsLibraryScreenProps) {
  const { messages } = usePodcasts();
  const iosRouter = useIosRouter();
  const viewTitle =
    view === "shows"
      ? messages.Shows
      : view === "saved"
        ? messages.Saved
        : view === "recent"
          ? messages["Recently Played"]
          : messages.Library;

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar
        title={viewTitle}
        titleDisplay={view ? "inline" : "large"}
        leading={
          view ? (
            <IosBarButton
              aria-label={`${messages.Back}: ${messages.Library}`}
              onClick={function returnToLibrary() {
                iosRouter.back(getTabHref("library"));
              }}
            >
              <ChevronLeftIcon strokeWidth={2.6} />
            </IosBarButton>
          ) : (
            <IosAppSwitcherButton />
          )
        }
      />
      <Suspense fallback={<EpisodeListSkeleton label={viewTitle} />}>
        <PodcastsLibraryContent view={view} />
      </Suspense>
    </IosScreen>
  );
}
