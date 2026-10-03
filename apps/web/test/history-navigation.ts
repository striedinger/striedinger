import { useSyncExternalStore } from "react";

const historyChangeEvent = "test-history-change";
let isHistoryPatched = false;

/**
 * Mirrors how the Next.js App Router reacts to `history.pushState` and `replaceState`: the
 * hook below re-renders with the new URL, so shallow routing behaves as it does in the app.
 */
function patchHistory() {
  if (isHistoryPatched) return;
  isHistoryPatched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = function updateHistory(...args: Parameters<History["pushState"]>) {
      original(...args);
      window.dispatchEvent(new Event(historyChangeEvent));
    };
  }
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener(historyChangeEvent, onChange);
  window.addEventListener("popstate", onChange);
  return function unsubscribeFromLocation() {
    window.removeEventListener(historyChangeEvent, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function readPathname() {
  return window.location.pathname;
}

export function useHistoryPathname() {
  patchHistory();
  return useSyncExternalStore(subscribeToLocation, readPathname, readPathname);
}
