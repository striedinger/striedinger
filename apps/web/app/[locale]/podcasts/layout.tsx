import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { loadPodcastMessages } from "../../../messages/podcasts/load-messages";
import { getRequestLocale } from "../../get-request-locale";
import { podcastsFrameClassName } from "./podcasts-frame";
import { PodcastsShell } from "./podcasts-shell";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

interface PodcastsLayoutProps {
  children: ReactNode;
}

/**
 * The tab bar, player, and menus live here so they stay in place while screens, each its own
 * route, push and pop beneath them.
 */
export default async function PodcastsLayout({ children }: PodcastsLayoutProps) {
  const locale = await getRequestLocale();
  const messages = await loadPodcastMessages(locale);

  return (
    <IosAppFrame className={podcastsFrameClassName}>
      <PodcastsShell locale={locale} messages={messages}>
        {children}
      </PodcastsShell>
    </IosAppFrame>
  );
}
