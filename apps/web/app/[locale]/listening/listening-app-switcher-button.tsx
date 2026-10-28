"use client";

import { useSyncExternalStore } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";

/**
 * The app switcher button, shown only when the page is opened directly. Inside X's player
 * card there is no room for the sheet, and the card is a window onto the song, not the site.
 * It stays hidden until hydration, so the embedded card never flashes it.
 */
export function ListeningAppSwitcherButton() {
  const isTopLevel = useSyncExternalStore(subscribeToNothing, isTopLevelWindow, isNotKnownYet);
  return isTopLevel ? <IosAppSwitcherButton /> : null;
}

function subscribeToNothing() {
  return function unsubscribe() {};
}

// Comparing the windows is allowed even when a cross-origin page frames this one.
function isTopLevelWindow() {
  return window.self === window.top;
}

function isNotKnownYet() {
  return false;
}
