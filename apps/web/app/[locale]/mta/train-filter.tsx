"use client";

import { cn } from "@workspace/ui/lib/utils";

import type { Coordinates, MtaLabels } from "./types";

import { useMtaNavigation } from "./mta-navigation-provider";
import { TrainIcon } from "./train-icon";

interface TrainFilterProps {
  coordinates: Coordinates;
  labels: MtaLabels;
  locationName: string;
  routes: readonly string[];
  selectedRoute: string | null;
}

/** A row of line bullets that scrolls sideways with the finger, like a filter bar in Maps. */
export function TrainFilter({
  coordinates,
  labels,
  locationName,
  routes,
  selectedRoute,
}: TrainFilterProps) {
  const { actions, state } = useMtaNavigation();
  // A tapped filter shows as selected while the server loads its arrivals.
  const displayedRoute = state.pendingRoute === undefined ? selectedRoute : state.pendingRoute;

  function selectRoute(route: string | null) {
    actions.navigateToLocation(coordinates.latitude, coordinates.longitude, locationName, route);
  }

  return (
    <div
      role="group"
      aria-label={labels.filterByTrain}
      className="flex snap-x scroll-px-4 scrollbar-none gap-1.5 overflow-x-auto overscroll-x-contain px-4 py-1 [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        aria-pressed={displayedRoute === null}
        className={cn(
          "h-9 shrink-0 snap-start rounded-full px-4 text-ios-subheadline font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:scale-95 motion-safe:transition-transform",
          displayedRoute === null ? "bg-ios-tint text-white" : "bg-ios-grouped-cell text-ios-label",
        )}
        onClick={function selectAllTrains() {
          selectRoute(null);
        }}
      >
        {labels.allTrains}
      </button>
      {routes.map(function renderRouteFilter(route) {
        const isSelected = displayedRoute === route;
        return (
          <button
            key={route}
            type="button"
            aria-label={`${labels.filterByTrain}: ${route}`}
            aria-pressed={isSelected}
            className={cn(
              "flex size-9 shrink-0 snap-start items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:scale-90 motion-safe:transition-[transform,opacity]",
              isSelected
                ? "ring-2 ring-ios-label ring-offset-2 ring-offset-ios-grouped-background"
                : displayedRoute && "opacity-45",
            )}
            onClick={function selectTrainRoute() {
              selectRoute(isSelected ? null : route);
            }}
          >
            <TrainIcon route={route} />
          </button>
        );
      })}
    </div>
  );
}
