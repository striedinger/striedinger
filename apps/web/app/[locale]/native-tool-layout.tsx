import type { Viewport } from "next";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { getAppSwitcherLabels } from "../../components/ios/get-app-switcher-labels";
import { IosAppFrame } from "../../components/ios/ios-app-frame";
import { iosFallbackFont } from "../../components/ios/ios-font";
import { getRequestLocale } from "../get-request-locale";

/** Browser chrome matches the grouped background native tools scroll on. */
export const nativeToolViewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

interface NativeToolLayoutProps {
  children: ReactNode;
  /** The tool's path, such as `/json`, which the app switcher marks as current. */
  href: string;
  /** Sets the tool's `--ios-tint` for light and dark appearances. */
  tintClassName: string;
}

/** Runs a browser tool full screen like an installed iOS app, linked to the others. */
export async function NativeToolLayout({ children, href, tintClassName }: NativeToolLayoutProps) {
  const locale = await getRequestLocale();
  const appSwitcherLabels = await getAppSwitcherLabels(locale);

  return (
    <IosAppFrame
      className={cn(iosFallbackFont.variable, tintClassName)}
      appSwitcher={{ currentHref: href, labels: appSwitcherLabels }}
    >
      {children}
    </IosAppFrame>
  );
}
