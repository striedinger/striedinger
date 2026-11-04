"use client";

import { useEffect, useSyncExternalStore } from "react";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { useIosAppSwitcher } from "../../../components/ios/ios-app-switcher-context";

// Safari has no requestIdleCallback, so it waits this long after the page settles instead.
const idleFallbackDelayMs = 1_500;

/**
 * The app switcher button, shown only when the page is opened directly. Inside X's player
 * card there is no room for the sheet, and the card is a window onto the song, not the site.
 * It stays hidden until hydration, so the embedded card never flashes it.
 *
 * Visitors usually arrive here cold from a post, with none of the site cached, so the sheet's
 * code downloads once the browser is idle instead of on the first tap, which would otherwise
 * wait on it.
 */
export function ListeningAppSwitcherButton() {
  const isTopLevel = useSyncExternalStore(subscribeToNothing, isTopLevelWindow, isNotKnownYet);
  const appSwitcher = useIosAppSwitcher();
  const prepareAppSwitcher = appSwitcher?.prepareAppSwitcher;

  useEffect(
    function prepareSheetWhenIdle() {
      if (!isTopLevel || !prepareAppSwitcher) return;
      if (typeof window.requestIdleCallback === "function") {
        const idleCallback = window.requestIdleCallback(prepareAppSwitcher);
        return function cancelIdlePreparation() {
          window.cancelIdleCallback(idleCallback);
        };
      }
      const timeout = window.setTimeout(prepareAppSwitcher, idleFallbackDelayMs);
      return function cancelDelayedPreparation() {
        window.clearTimeout(timeout);
      };
    },
    [isTopLevel, prepareAppSwitcher],
  );

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
