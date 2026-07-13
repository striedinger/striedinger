import type { LiveStation, MtaLabels } from "./types";

import { StationCard } from "./station-card";
import { useMasonryGrid } from "./use-masonry-grid";

interface StationGridProps {
  labels: MtaLabels;
  locale: string;
  stations: readonly LiveStation[];
}

export function StationGrid({ labels, locale, stations }: StationGridProps) {
  const layoutKey = stations
    .map(function createLayoutKey(station) {
      return `${station.id}:${station.arrivals.length}`;
    })
    .join("|");
  const gridElement = useMasonryGrid(layoutKey);

  return (
    <div ref={gridElement} className="grid grid-flow-row-dense items-start gap-4 lg:grid-cols-2">
      {stations.map(function renderStation(station) {
        return (
          <div key={station.id} data-masonry-item>
            <StationCard labels={labels} locale={locale} station={station} />
          </div>
        );
      })}
    </div>
  );
}
