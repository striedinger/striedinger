import type { LiveStation, MtaLabels } from "./types";

import { MasonryGrid } from "./masonry-grid";
import { StationCard } from "./station-card";

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

  return (
    <MasonryGrid layoutKey={layoutKey}>
      {stations.map(function renderStation(station) {
        return (
          <div key={station.id} data-masonry-item>
            <StationCard labels={labels} locale={locale} station={station} />
          </div>
        );
      })}
    </MasonryGrid>
  );
}
