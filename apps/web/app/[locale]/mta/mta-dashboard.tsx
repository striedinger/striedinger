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
        <section aria-labelledby="nearby-heading" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3 px-4">
            <div className="flex min-w-0 flex-col">
              <Text
                as="h2"
                id="nearby-heading"
                className="text-ios-footnote text-ios-secondary-label font-semibold uppercase"
              >
                {labels.nearbyStops}
              </Text>
              <Text numberOfLines={1} className="text-ios-title3 text-ios-label font-semibold">
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
            <Text
              role="alert"
              className="bg-ios-grouped-cell text-ios-subheadline text-ios-red mx-4 rounded-[18px] px-4 py-3"
            >
              {labels.arrivalError}
            </Text>
          ) : null}
          <StationGrid labels={labels} locale={locale} stations={displayedStations} />
          <Text className="text-ios-caption1 text-ios-secondary-label px-8">
            {labels.attribution}
          </Text>
        </section>
        <MtaLocationControls initialSearchFailed={initialSearchFailed} labels={labels} />
      </MtaNavigationFrame>
    </MtaNavigationProvider>
  );
}
