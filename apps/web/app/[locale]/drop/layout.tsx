import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { dropFrameClassName } from "./drop-frame";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Drop runs full screen like an installed iOS app. */
export default function DropLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <IosAppFrame className={dropFrameClassName}>{children}</IosAppFrame>;
}
