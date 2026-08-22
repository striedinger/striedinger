"use client";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent } from "react";

import type { MtaLabels } from "./types";

import { useMtaNavigation } from "./mta-navigation-provider";

interface MtaRefreshControlsProps {
  initialUpdatedAt: string;
  labels: MtaLabels;
  locale: string;
}

export function MtaRefreshControls({ initialUpdatedAt, labels, locale }: MtaRefreshControlsProps) {
  const { actions, state } = useMtaNavigation();
  const updatedAt = new Date(initialUpdatedAt);
  const refresh = useEffectEvent(function refreshServerData() {
    actions.refresh();
  });

  useEffect(function refreshArrivalsEveryMinute() {
    const intervalId = window.setInterval(function refreshArrivals() {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, 60_000);
    return function stopRefreshing() {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="size-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
      <Text size="xs" tone="muted">
        {labels.updated}{" "}
        {updatedAt.toLocaleTimeString(locale, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        })}{" "}
        · {labels.refreshes}
      </Text>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={labels.refresh}
        loading={state.isNavigating}
        onClick={actions.refresh}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M20 6v5h-5M4 18v-5h5M18.5 9a7 7 0 0 0-12-2L4 11m16 2-2.5 4a7 7 0 0 1-12-2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
    </div>
  );
}
