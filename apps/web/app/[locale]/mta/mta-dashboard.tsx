import { Text } from "@workspace/ui/components/text";

import type { InitialMtaState, LiveStation, MtaLabels } from "./types";

import { MtaLocationControls } from "./mta-location-controls";
import { MtaNavigationFrame } from "./mta-navigation-frame";
import { MtaNavigationProvider } from "./mta-navigation-provider";
import { MtaRefreshControls } from "./mta-refresh-controls";
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
  const { coordinates, locationName, selectedRoute } = initialState;
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

  return (
    <MtaNavigationProvider>
      <MtaNavigationFrame>
        <MtaLocationControls initialSearchFailed={initialSearchFailed} labels={labels} />

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
            <MtaRefreshControls
              initialUpdatedAt={initialUpdatedAt}
              labels={labels}
              locale={locale}
            />
          </div>

          <TrainFilter
            coordinates={coordinates}
            labels={labels}
            locationName={locationName}
            routes={subwayRoutes}
            selectedRoute={selectedRoute}
          />
          {initialStations.length === 0 ? (
            <Text tone="destructive">{labels.arrivalError}</Text>
          ) : null}
          <StationGrid labels={labels} locale={locale} stations={displayedStations} />
        </section>
      </MtaNavigationFrame>
    </MtaNavigationProvider>
  );
}
