"use client";

import { useSyncExternalStore } from "react";

function subscribeToNothing() {
  return function unsubscribeFromNothing() {};
}

function readClientValue() {
  return true;
}

function readServerValue() {
  return false;
}

/**
 * False while the server renders and during hydration, then true. Content that depends on
 * data stored in the browser can show a placeholder until then instead of popping in.
 */
export function useIsHydrated() {
  return useSyncExternalStore(subscribeToNothing, readClientValue, readServerValue);
}
