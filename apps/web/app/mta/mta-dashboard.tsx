"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { InitialMtaState, LiveStation, MtaLabels } from "./types";

import { StationGrid } from "./station-grid";
import { TrainFilter } from "./train-filter";

const subwayRoutes = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "A",
  "C",
  "E",
  "B",
  "D",
  "F",
  "M",
  "G",
  "J",
  "Z",
  "L",
  "N",
  "Q",
  "R",
  "W",
  "S",
] as const;

interface MtaDashboardProps {
  initialState: InitialMtaState;
  initialStations: LiveStation[];
  initialSearchFailed: boolean;
  initialUpdatedAt: string;
  labels: MtaLabels;
  locale: string;
}

export function MtaDashboard({
  initialState,
  initialStations,
  initialSearchFailed,
  initialUpdatedAt,
  labels,
  locale,
}: MtaDashboardProps) {
  const router = useRouter();
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");
  const [isNavigating, startNavigation] = useTransition();
  const { coordinates, locationName, selectedRoute } = initialState;
  const updatedAt = new Date(initialUpdatedAt);
  const displayedStations = initialStations.flatMap(function filterStation(station) {
    if (selectedRoute && !station.routes.includes(selectedRoute)) return [];
    const arrivals = selectedRoute
      ? station.arrivals
          .filter(function matchesSelectedRoute(arrival) {
            return arrival.route === selectedRoute;
          })
          .slice(0, 16)
      : station.arrivals.slice(0, 8);
    return [{ ...station, arrivals }];
  });

  useEffect(
    function refreshArrivalsEveryMinute() {
      const intervalId = window.setInterval(function refreshArrivals() {
        if (document.visibilityState !== "visible") return;
        startNavigation(function refreshServerData() {
          router.refresh();
        });
      }, 60_000);
      return function stopRefreshing() {
        window.clearInterval(intervalId);
      };
    },
    [router],
  );

  function navigateToLocation(
    latitude: number,
    longitude: number,
    nextLocationName: string,
    route: string | null,
  ) {
    const parameters = new URLSearchParams({
      latitude: latitude.toFixed(6),
      location: nextLocationName,
      longitude: longitude.toFixed(6),
    });
    if (route) parameters.set("train", route);
    startNavigation(function loadServerArrivals() {
      router.push(`/mta?${parameters}`);
    });
  }

  function detectLocation() {
    setLocationState("loading");
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function useDetectedLocation(position) {
        setLocationState("idle");
        navigateToLocation(
          position.coords.latitude,
          position.coords.longitude,
          labels.currentLocation,
          null,
        );
      },
      function showLocationError() {
        setLocationState("error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-10" aria-busy={isNavigating}>
      <Surface as="section" className="p-5 sm:p-6" aria-labelledby="location-heading">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <Text as="h2" id="location-heading" size="sm" weight="semibold">
              {labels.locationLabel}
            </Text>
          </div>
          <form action="/mta" className="flex flex-col gap-3 sm:flex-row" role="search">
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <Input
                id="mta-location"
                name="q"
                type="search"
                placeholder={labels.locationPlaceholder}
                aria-label={labels.locationLabel}
                maxLength={160}
                className="h-11 rounded-xl bg-background pl-12 shadow-none"
              />
            </div>
            <Button type="submit" className="h-11 rounded-xl px-5">
              {labels.search}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              onClick={detectLocation}
              loading={locationState === "loading"}
              loadingLabel={labels.locating}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {labels.useLocation}
            </Button>
          </form>
          <Text
            size="xs"
            tone={locationState === "error" || initialSearchFailed ? "destructive" : "muted"}
          >
            {locationState === "error"
              ? labels.locationError
              : initialSearchFailed
                ? labels.searchError
                : labels.searchHint}
          </Text>
        </div>
      </Surface>

      <section className="flex flex-col gap-5" aria-labelledby="nearby-heading">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <Text as="h2" id="nearby-heading" size="2xl" weight="semibold">
              {labels.nearbyStops}
            </Text>
            <Text size="sm" tone="muted">
              {locationName}
            </Text>
          </div>
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
              loading={isNavigating}
              onClick={function refreshNow() {
                startNavigation(function refreshServerData() {
                  router.refresh();
                });
              }}
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
        </div>

        <TrainFilter
          labels={labels}
          routes={subwayRoutes}
          selectedRoute={selectedRoute}
          onSelectRoute={function selectRoute(route) {
            navigateToLocation(coordinates.latitude, coordinates.longitude, locationName, route);
          }}
        />
        {initialStations.length === 0 ? (
          <Text tone="destructive">{labels.arrivalError}</Text>
        ) : null}
        <StationGrid labels={labels} locale={locale} stations={displayedStations} />
      </section>
    </div>
  );
}
