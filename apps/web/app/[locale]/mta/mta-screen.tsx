import type { ReactNode } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";

interface MtaScreenProps {
  children: ReactNode;
  title: string;
}

/** The scrolling screen with its large title, shared by the page and its loading state. */
export function MtaScreen({ children, title }: MtaScreenProps) {
  return (
    <div
      data-ios-scroll
      className="flex size-full flex-col overflow-y-auto overscroll-contain bg-(--ios-grouped-background) pb-[calc(env(safe-area-inset-bottom)+6.5rem)] [--ios-bar-edge:var(--ios-grouped-background)] [--ios-content-width:64rem]"
    >
      <IosNavigationBar title={title} leading={<IosAppSwitcherButton />} />
      <div className="mx-auto flex w-full max-w-(--ios-content-width) flex-col">{children}</div>
    </div>
  );
}
