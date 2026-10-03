import type { ReactNode } from "react";

import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";

interface SudokuScreenProps {
  children: ReactNode;
  title: string;
}

/** The scrolling screen with its large title, shared by the page and its loading state. */
export function SudokuScreen({ children, title }: SudokuScreenProps) {
  return (
    <div
      data-ios-scroll
      className="flex size-full flex-col overflow-y-auto overscroll-contain bg-(--ios-grouped-background) pb-[max(env(safe-area-inset-bottom),20px)] [--ios-bar-edge:var(--ios-grouped-background)]"
    >
      <IosNavigationBar title={title} />
      <div className="mx-auto flex w-full max-w-xl flex-col px-4">{children}</div>
    </div>
  );
}
