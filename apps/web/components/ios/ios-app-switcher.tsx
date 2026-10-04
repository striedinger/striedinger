"use client";

import type { ComponentType, ComponentProps, ReactNode } from "react";

import { useState } from "react";

import type { IosAppSwitcherSheet as IosAppSwitcherSheetComponent } from "./ios-app-switcher-sheet";

import { importAppSwitcherSheet } from "./import-app-switcher-sheet";
import { IosAppSwitcherContext, type IosAppSwitcherLabels } from "./ios-app-switcher-context";

interface IosAppSwitcherProps {
  children: ReactNode;
  /** The path of the app showing the switcher, such as `/notes`. */
  currentHref: string;
  labels: IosAppSwitcherLabels;
}

type SheetComponent = ComponentType<ComponentProps<typeof IosAppSwitcherSheetComponent>>;

/**
 * Lets any screen of a native app open the sheet that links to the other apps and tools. The
 * sheet's code loads the first time a switcher button is touched, hovered, or focused, and the
 * sheet mounts closed before it opens so it slides up the first time too.
 */
export function IosAppSwitcher({ children, currentHref, labels }: IosAppSwitcherProps) {
  const [sheet, setSheet] = useState<{ Component: SheetComponent } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function loadSheet() {
    const { IosAppSwitcherSheet } = await importAppSwitcherSheet();
    setSheet(function keepLoadedSheet(current) {
      return current ?? { Component: IosAppSwitcherSheet };
    });
  }

  function prepareAppSwitcher() {
    void loadSheet();
  }

  async function openAppSwitcher() {
    if (!sheet) {
      // Render the closed sheet first, then open it once that frame has painted.
      await loadSheet();
      await waitForNextFrame();
      await waitForNextFrame();
    }
    setIsOpen(true);
  }

  return (
    <IosAppSwitcherContext
      value={{
        labels,
        openAppSwitcher: function openFromButton() {
          void openAppSwitcher();
        },
        prepareAppSwitcher,
      }}
    >
      {children}
      {sheet ? (
        <sheet.Component
          currentHref={currentHref}
          labels={labels}
          open={isOpen}
          onOpenChange={setIsOpen}
        />
      ) : null}
    </IosAppSwitcherContext>
  );
}

function waitForNextFrame() {
  return new Promise<void>(function scheduleFrame(resolve) {
    requestAnimationFrame(function resolveOnFrame() {
      resolve();
    });
  });
}
