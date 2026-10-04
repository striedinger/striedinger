import type { Viewport } from "next";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { getAppSwitcherLabels } from "../../components/ios/get-app-switcher-labels";
import { IosAppFrame } from "../../components/ios/ios-app-frame";
import { iosFallbackFont } from "../../components/ios/ios-font";
import { IosToolScreen } from "../../components/ios/ios-tool-screen";
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
  /**
   * The tool's large title. With it, the layout renders the screen and title once, so the
   * page's loading state stands in only for the content beneath them.
   */
  title?: string;
  /** The centered content column's width on wide screens, such as `42rem`. */
  contentWidth?: string;
}

/** Runs a browser tool full screen like an installed iOS app, linked to the others. */
export async function NativeToolLayout({
  children,
  contentWidth,
  href,
  tintClassName,
  title,
}: NativeToolLayoutProps) {
  const locale = await getRequestLocale();
  const appSwitcherLabels = await getAppSwitcherLabels(locale);

  return (
    <IosAppFrame
      className={cn(iosFallbackFont.variable, tintClassName)}
      appSwitcher={{ currentHref: href, labels: appSwitcherLabels }}
    >
      {title ? (
        <IosToolScreen title={title} contentWidth={contentWidth}>
          {children}
        </IosToolScreen>
      ) : (
        children
      )}
    </IosAppFrame>
  );
}
