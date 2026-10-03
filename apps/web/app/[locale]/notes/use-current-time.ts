"use client";

import { useSyncExternalStore } from "react";

const minuteMilliseconds = 60_000;
let currentTime: number | null = null;

function subscribeToMinutes(onChange: () => void) {
  const interval = window.setInterval(function advanceTime() {
    currentTime = Date.now();
    onChange();
  }, minuteMilliseconds);
  return function stopAdvancingTime() {
    window.clearInterval(interval);
  };
}

function readCurrentTime() {
  currentTime ??= Date.now();
  return currentTime;
}

function readServerTime() {
  return 0;
}

/**
 * The time relative note dates are measured from, refreshed every minute. The server renders
 * without a clock, so the page prerenders; notes only appear once the browser has loaded them.
 */
export function useCurrentTime() {
  return useSyncExternalStore(subscribeToMinutes, readCurrentTime, readServerTime);
}
