"use client";

import type { ReactNode } from "react";

import type { PodcastMessages } from "./types";

import { IosNavigationProvider } from "../../../components/ios/ios-navigation-provider";
import { getPodcastPathDepth, getPodcastPathScope } from "./podcast-route";
import { PodcastsChrome } from "./podcasts-chrome";

interface PodcastsShellProps {
  children: ReactNode;
  locale: string;
  messages: PodcastMessages;
}

/** The Podcasts layout's client side: navigation, bars, and the player around every screen. */
export function PodcastsShell({ children, locale, messages }: PodcastsShellProps) {
  return (
    <IosNavigationProvider getDepth={getPodcastPathDepth} getScope={getPodcastPathScope}>
      <PodcastsChrome locale={locale} messages={messages}>
        {children}
      </PodcastsChrome>
    </IosNavigationProvider>
  );
}
