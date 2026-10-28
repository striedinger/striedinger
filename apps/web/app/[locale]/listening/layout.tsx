import type { Viewport } from "next";
import type { ReactNode } from "react";

import { getAppSwitcherLabels } from "../../../components/ios/get-app-switcher-labels";
import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { getRequestLocale } from "../../get-request-locale";

/** The page also runs inside X's player card, which has no safe areas to cover. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
};

// Spotify's green tints the equalizer and logo.
const listeningFrameClassName = "[--ios-tint:#1db954] dark:[--ios-tint:#1ed760]";

/**
 * Now Playing fills whatever frame holds it, usually the iframe of an X player card. It has no
 * navigation bar; its app switcher button shows only when the page is opened directly.
 */
export default async function ListeningLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();
  const appSwitcherLabels = await getAppSwitcherLabels(locale);

  return (
    <IosAppFrame
      className={listeningFrameClassName}
      appSwitcher={{ currentHref: "/listening", labels: appSwitcherLabels }}
    >
      {children}
    </IosAppFrame>
  );
}
