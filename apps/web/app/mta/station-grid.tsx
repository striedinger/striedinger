import type { LiveStation, MtaLabels } from "./types";

import { StationCard } from "./station-card";

interface StationGridProps {
  labels: MtaLabels;
  locale: string;
  stations: readonly LiveStation[];
}

export function StationGrid({ labels, locale, stations }: StationGridProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {stations.map(function renderStation(station) {
        return <StationCard key={station.id} labels={labels} locale={locale} station={station} />;
      })}
    </div>
  );
}
