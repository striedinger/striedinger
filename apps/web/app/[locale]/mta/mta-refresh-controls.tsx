"use client";

import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent } from "react";

import type { MtaLabels } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { getDateTimeFormat } from "../../../lib/intl-cache";
import { useMtaNavigation } from "./mta-navigation-provider";

const refreshIntervalMilliseconds = 60_000;

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

  const isStale = useEffectEvent(function isArrivalDataStale() {
    return Date.now() - new Date(initialUpdatedAt).getTime() >= refreshIntervalMilliseconds;
  });

  // Arrivals refresh every minute while the page is visible, pause while it is hidden, and
  // refresh right away on return if the minute has passed.
  useEffect(function refreshArrivalsWhileVisible() {
    let intervalId: number | undefined;
    function startRefreshing() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(refresh, refreshIntervalMilliseconds);
    }
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        window.clearInterval(intervalId);
        return;
      }
      if (isStale()) refresh();
      startRefreshing();
    }
    if (document.visibilityState === "visible") startRefreshing();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return function stopRefreshing() {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Text className="text-ios-caption1 text-ios-secondary-label hidden text-right sm:block">
        {labels.updated}{" "}
        {getDateTimeFormat(locale, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        }).format(updatedAt)}
        <br />
        {labels.refreshes}
      </Text>
      <Text className="text-ios-caption1 text-ios-secondary-label tabular-nums sm:hidden">
        {getDateTimeFormat(locale, {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        }).format(updatedAt)}
      </Text>
      <IosBarButton
        aria-label={labels.refresh}
        disabled={state.isNavigating}
        className="text-ios-tint"
        onClick={actions.refresh}
      >
        <RefreshIcon className={state.isNavigating ? "animate-spin" : undefined} />
      </IosBarButton>
    </div>
  );
}
