import type { Viewport } from "next";
import type { ReactNode } from "react";

import { getAppSwitcherLabels } from "../../../components/ios/get-app-switcher-labels";
import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { getOnDeviceAiLabels } from "../../../lib/on-device-ai/get-on-device-ai-labels";
import { getTranslator } from "../../../messages/get-translator";
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
  const [messages, appSwitcherLabels, translate] = await Promise.all([
    loadPodcastMessages(locale),
    getAppSwitcherLabels(locale),
    getTranslator(locale),
  ]);

  return (
    <IosAppFrame
      className={podcastsFrameClassName}
      appSwitcher={{ currentHref: "/podcasts", labels: appSwitcherLabels }}
    >
      <PodcastsShell aiLabels={getOnDeviceAiLabels(translate)} locale={locale} messages={messages}>
        {children}
      </PodcastsShell>
    </IosAppFrame>
  );
}
