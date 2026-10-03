import type { LiveStation, MtaLabels } from "./types";

import { StationCard } from "./station-card";

interface StationGridProps {
  labels: MtaLabels;
  locale: string;
  stations: readonly LiveStation[];
}

/**
 * Stations in distance order, flowing into two masonry-style columns on large screens. CSS
 * columns size each card to its content, so cards never shift after rendering or refreshing,
 * and reading order matches the visual order.
 */
export function StationGrid({ labels, locale, stations }: StationGridProps) {
  return (
    <div className="gap-4 lg:columns-2">
      {stations.map(function renderStation(station) {
        return (
          <div key={station.id} className="mb-4 break-inside-avoid">
            <StationCard labels={labels} locale={locale} station={station} />
          </div>
        );
      })}
    </div>
  );
}
