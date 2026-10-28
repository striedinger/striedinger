import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";

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
 * Now Playing fills whatever frame holds it, usually the iframe of an X player card, so it
 * leaves out the app switcher and navigation bar the other native apps carry.
 */
export default function ListeningLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <IosAppFrame className={listeningFrameClassName}>{children}</IosAppFrame>;
}
