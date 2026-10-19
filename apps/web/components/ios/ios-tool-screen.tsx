import type { CSSProperties, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { IosAppSwitcherButton } from "./ios-app-switcher-button";
import { IosNavigationBar } from "./ios-navigation-bar";

interface IosToolScreenProps {
  children: ReactNode;
  /** Replaces the content column's default spacing, for tools laid out edge to edge. */
  contentClassName?: string;
  /** The width of the centered content column on wide screens, such as `42rem`. */
  contentWidth?: string;
  /** Replaces the default bottom padding, such as room for a floating bar. */
  scrollClassName?: string;
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
  contentClassName = "gap-6 px-4 pt-1",
  contentWidth = "42rem",
  scrollClassName = "pb-safe-min-6",
  title,
  trailing,
}: IosToolScreenProps) {
  return (
    <div
      data-ios-scroll
      className={cn(
        "flex size-full flex-col overflow-y-auto overscroll-contain bg-ios-grouped-background [--ios-bar-edge:var(--ios-grouped-background)]",
        scrollClassName,
      )}
      style={{ "--ios-content-width": contentWidth } as CSSProperties}
    >
      <IosNavigationBar title={title} leading={<IosAppSwitcherButton />} trailing={trailing} />
      <div
        className={cn("mx-auto flex w-full max-w-(--ios-content-width) flex-col", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
