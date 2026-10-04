import type { CSSProperties, ReactNode } from "react";

import { IosAppSwitcherButton } from "./ios-app-switcher-button";
import { IosNavigationBar } from "./ios-navigation-bar";

interface IosToolScreenProps {
  children: ReactNode;
  /** The width of the centered content column on wide screens, such as `42rem`. */
  contentWidth?: string;
  title: string;
  trailing?: ReactNode;
}

/**
 * A single-screen native tool: a grouped background that scrolls under a large-title
 * navigation bar with the app switcher, and content centered in a column the title lines up
 * with. Render it from the server page so the title paints before any data loads.
 */
export function IosToolScreen({
  children,
  contentWidth = "42rem",
  title,
  trailing,
}: IosToolScreenProps) {
  return (
    <div
      data-ios-scroll
      className="flex size-full flex-col overflow-y-auto overscroll-contain bg-ios-grouped-background pb-[max(env(safe-area-inset-bottom),24px)] [--ios-bar-edge:var(--ios-grouped-background)]"
      style={{ "--ios-content-width": contentWidth } as CSSProperties}
    >
      <IosNavigationBar title={title} leading={<IosAppSwitcherButton />} trailing={trailing} />
      <div className="mx-auto flex w-full max-w-(--ios-content-width) flex-col gap-6 px-4 pt-1">
        {children}
      </div>
    </div>
  );
}
