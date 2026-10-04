import type { ReactNode } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";

interface SudokuScreenProps {
  children: ReactNode;
  title: string;
}

/**
 * The game screen, sized to the viewport like a native game: the title, controls, and number
 * pad keep their size and the board takes whatever room is left, so the whole game fits on
 * any phone without scrolling.
 */
export function SudokuScreen({ children, title }: SudokuScreenProps) {
  return (
    <div
      data-ios-scroll
      className="flex size-full flex-col overflow-y-auto overscroll-contain bg-ios-grouped-background [--ios-bar-edge:var(--ios-grouped-background)] [--ios-content-width:36rem]"
    >
      <IosNavigationBar title={title} leading={<IosAppSwitcherButton />} />
      <div className="mx-auto flex min-h-104 w-full max-w-(--ios-content-width) flex-1 flex-col px-4 pb-safe-min-3.5">
        {children}
      </div>
    </div>
  );
}
