"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

interface ListeningRefresherProps {
  /**
   * How long the current song has left, measured on the server, so the next one shows up
   * right away. A duration rather than a time, so the viewer's clock never has to agree with
   * the server's.
   */
  msUntilTrackEnds: number | null;
}

const refreshIntervalMs = 15_000;
// Spotify takes a moment to report the next song after one ends, and the server shares a
// reading for a few seconds, so a song that should have ended is checked on more often.
const trackChangeDelayMs = 1_500;
const pastTrackEndIntervalMs = 4_000;

/** Reloads the reading from the server while the page is visible. */
export function ListeningRefresher({ msUntilTrackEnds }: ListeningRefresherProps) {
  const router = useRouter();

  useEffect(
    function refreshWhileVisible() {
      let timeout: number | undefined;
      const trackEndsAt = msUntilTrackEnds === null ? null : Date.now() + msUntilTrackEnds;

      function refresh() {
        startTransition(function refreshListeningState() {
          router.refresh();
        });
      }

      function scheduleRefresh() {
        window.clearTimeout(timeout);
        if (document.visibilityState !== "visible") return;
        const untilTrackChanges =
          trackEndsAt === null ? Infinity : trackEndsAt - Date.now() + trackChangeDelayMs;
        const delay =
          untilTrackChanges > 0
            ? Math.min(refreshIntervalMs, untilTrackChanges)
            : pastTrackEndIntervalMs;
        timeout = window.setTimeout(function refreshAndReschedule() {
          refresh();
          scheduleRefresh();
        }, delay);
      }

      function handleVisibilityChange() {
        if (document.visibilityState === "visible") refresh();
        scheduleRefresh();
      }

      scheduleRefresh();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return function stopRefreshing() {
        window.clearTimeout(timeout);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    },
    [router, msUntilTrackEnds],
  );

  return null;
}
