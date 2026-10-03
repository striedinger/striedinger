import type { Viewport } from "next";
import type { ReactNode } from "react";

import { getAppSwitcherLabels } from "../../../components/ios/get-app-switcher-labels";
import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { getRequestLocale } from "../../get-request-locale";
import { dropFrameClassName } from "./drop-frame";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Drop runs full screen like an installed iOS app. */
export default async function DropLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();
  const appSwitcherLabels = await getAppSwitcherLabels(locale);

  return (
    <IosAppFrame
      className={dropFrameClassName}
      appSwitcher={{ currentHref: "/drop", labels: appSwitcherLabels }}
    >
      {children}
    </IosAppFrame>
  );
}
