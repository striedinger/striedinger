"use client";

import { SquareGridIcon } from "@workspace/icons/square-grid-icon";

import { importAppSwitcherSheet } from "./import-app-switcher-sheet";
import { useIosAppSwitcher } from "./ios-app-switcher-context";
import { IosBarButton } from "./ios-bar-button";

/** The glass bar button that opens the app switcher sheet. */
export function IosAppSwitcherButton() {
  const appSwitcher = useIosAppSwitcher();
  if (!appSwitcher) return null;

  return (
    <IosBarButton
      aria-label={appSwitcher.labels.open}
      aria-haspopup="dialog"
      onClick={appSwitcher.openAppSwitcher}
      onPointerEnter={importAppSwitcherSheet}
      onTouchStart={importAppSwitcherSheet}
      onFocus={importAppSwitcherSheet}
    >
      <SquareGridIcon />
    </IosBarButton>
  );
}
