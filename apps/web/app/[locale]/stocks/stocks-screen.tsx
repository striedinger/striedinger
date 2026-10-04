import type { ReactNode } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";

interface StocksScreenProps {
  children: ReactNode;
  title: string;
}

/** The scrolling screen with its large title, shared by the page and its loading state. */
export function StocksScreen({ children, title }: StocksScreenProps) {
  return (
    <div
      data-ios-scroll
      className="flex size-full flex-col overflow-y-auto overscroll-contain bg-(--ios-grouped-background) pb-[max(env(safe-area-inset-bottom),20px)] [--ios-bar-edge:var(--ios-grouped-background)] [--ios-content-width:72rem]"
    >
      <IosNavigationBar title={title} trailing={<IosAppSwitcherButton />} />
      <div className="mx-auto flex w-full max-w-(--ios-content-width) flex-col">{children}</div>
    </div>
  );
}
