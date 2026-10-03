import type { Viewport } from "next";
import type { ReactNode } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { stocksFrameClassName } from "./stocks-frame";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Stocks runs full screen like the installed iOS app. */
export default function StocksLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <IosAppFrame className={stocksFrameClassName}>{children}</IosAppFrame>;
}
