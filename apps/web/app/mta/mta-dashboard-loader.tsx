import type { InitialMtaState, LiveStation, MtaLabels } from "./types";

import { getNearbyStations } from "../../lib/mta/live-arrivals";
import { MtaDashboard } from "./mta-dashboard";

interface MtaDashboardLoaderProps {
  initialState: InitialMtaState;
  labels: MtaLabels;
  locale: string;
}

export async function MtaDashboardLoader({
  initialState,
  labels,
  locale,
}: MtaDashboardLoaderProps) {
  const initialStations = await loadInitialStations(initialState);

  return (
    <MtaDashboard
      initialState={initialState}
      initialStations={initialStations}
      initialUpdatedAt={new Date().toISOString()}
      labels={labels}
      locale={locale}
    />
  );
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
