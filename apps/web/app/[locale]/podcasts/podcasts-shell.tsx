"use client";

import type { ReactNode } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { PodcastMessages } from "./types";

import { IosNavigationProvider } from "../../../components/ios/ios-navigation-provider";
import { getPodcastPathDepth, getPodcastPathScope } from "./podcast-route";
import { PodcastsChrome } from "./podcasts-chrome";

interface PodcastsShellProps {
  aiLabels: OnDeviceAiLabels;
  children: ReactNode;
  locale: string;
  messages: PodcastMessages;
}

/** The Podcasts layout's client side: navigation, bars, and the player around every screen. */
export function PodcastsShell({ aiLabels, children, locale, messages }: PodcastsShellProps) {
  return (
    <IosNavigationProvider getDepth={getPodcastPathDepth} getScope={getPodcastPathScope}>
      <PodcastsChrome aiLabels={aiLabels} locale={locale} messages={messages}>
        {children}
      </PodcastsChrome>
    </IosNavigationProvider>
  );
}
