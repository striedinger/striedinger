"use client";

import type { ReactNode } from "react";

import { lazy, Suspense, useState } from "react";

import { useHasOpened } from "../use-has-opened";
import { importAppSwitcherSheet } from "./import-app-switcher-sheet";
import { IosAppSwitcherContext, type IosAppSwitcherLabels } from "./ios-app-switcher-context";

interface IosAppSwitcherProps {
  children: ReactNode;
  /** The path of the app showing the switcher, such as `/notes`. */
  currentHref: string;
  labels: IosAppSwitcherLabels;
}

const IosAppSwitcherSheet = lazy(function loadAppSwitcherSheet() {
  return importAppSwitcherSheet().then(function selectSheet(module) {
    return { default: module.IosAppSwitcherSheet };
  });
});

/**
 * Lets any screen of a native app open the sheet that links to the other apps and tools. The
 * sheet's code loads the first time a switcher button is touched, hovered, or focused.
 */
export function IosAppSwitcher({ children, currentHref, labels }: IosAppSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasOpened = useHasOpened(isOpen);

  function openAppSwitcher() {
    setIsOpen(true);
  }

  return (
    <IosAppSwitcherContext value={{ labels, openAppSwitcher }}>
      {children}
      {hasOpened ? (
        <Suspense fallback={null}>
          <IosAppSwitcherSheet
            currentHref={currentHref}
            labels={labels}
            open={isOpen}
            onOpenChange={setIsOpen}
          />
        </Suspense>
      ) : null}
    </IosAppSwitcherContext>
  );
}
