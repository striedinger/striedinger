import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { mtaFrameClassName } from "./mta-frame";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Subway arrivals run full screen like an installed iOS app. */
export default function MtaLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <IosAppFrame className={mtaFrameClassName}>{children}</IosAppFrame>;
}
