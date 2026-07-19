import type { InitialMtaState, LiveStation, MtaLabels } from "./types";

import { getNearbyStations } from "../../lib/mta/live-arrivals";
import { searchLocations } from "../../lib/mta/search-locations";
import { MtaDashboard } from "./mta-dashboard";

interface MtaDashboardLoaderProps {
  initialState: InitialMtaState;
  labels: MtaLabels;
  locale: string;
  locationQuery: string;
}

export async function MtaDashboardLoader({
  initialState,
  labels,
  locale,
  locationQuery,
}: MtaDashboardLoaderProps) {
  const { searchFailed, state: resolvedState } = await resolveInitialState(
    initialState,
    locationQuery,
  );
  const initialStations = await loadInitialStations(resolvedState);

  return (
    <MtaDashboard
      initialState={resolvedState}
      initialStations={initialStations}
      initialSearchFailed={searchFailed}
      initialUpdatedAt={new Date().toISOString()}
      labels={labels}
      locale={locale}
    />
  );
}

async function resolveInitialState(initialState: InitialMtaState, locationQuery: string) {
  if (!locationQuery) return { searchFailed: false, state: initialState };
  const [suggestion] = await searchLocations(locationQuery, "search").catch(
    function useNoLocation() {
      return [];
    },
  );
  if (!suggestion) return { searchFailed: true, state: initialState };
  return {
    searchFailed: false,
    state: {
      coordinates: { latitude: suggestion.latitude, longitude: suggestion.longitude },
      locationName: suggestion.label,
      selectedRoute: initialState.selectedRoute,
    },
  };
}

async function loadInitialStations(initialState: InitialMtaState): Promise<LiveStation[]> {
  try {
    return await getNearbyStations(
      initialState.coordinates.latitude,
      initialState.coordinates.longitude,
      initialState.selectedRoute ?? undefined,
    );
  } catch {
    return [];
  }
}
