import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { LiveStation, MtaLabels } from "./types";

import { getDateTimeFormat } from "../../../lib/intl-cache";
import { TrainIcon } from "./train-icon";

interface StationCardProps {
  labels: MtaLabels;
  locale: string;
  station: LiveStation;
}

/** A station as an inset grouped list: its lines and distance, then upcoming trains. */
export function StationCard({ labels, locale, station }: StationCardProps) {
  const walkingMinutes = Math.max(2, Math.round(station.distance * 20));
  const arrivalFormat = getDateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York",
  });

  return (
    <article className="overflow-hidden rounded-ios-xl bg-ios-grouped-cell">
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Text as="h3" className="text-ios-body font-semibold text-ios-label">
            {station.name}
          </Text>
          <div className="flex flex-wrap gap-1" aria-label={station.routes.join(", ")}>
            {station.routes.map(function renderRoute(route) {
              return <TrainIcon key={route} route={route} size="small" />;
            })}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <Text className="text-ios-subheadline font-semibold text-ios-label tabular-nums">
            {station.distance.toFixed(1)} mi
          </Text>
          <Text className="text-ios-footnote text-ios-secondary-label tabular-nums">
            {walkingMinutes} min {labels.walk}
          </Text>
        </div>
      </header>
      <ul className="m-0 list-none p-0">
        {station.arrivals.map(function renderArrival(arrival, index) {
          const tooltipId = `arrival-time-${station.id}-${index}`;
          const isArriving = arrival.minutes <= 2;
          return (
            <li
              key={`${arrival.route}-${arrival.direction}-${arrival.arrivalAt}-${index}`}
              className="relative flex min-h-[54px] items-center gap-3 py-2 pr-4 pl-4 before:absolute before:top-0 before:right-0 before:left-[52px] before:h-px before:scale-y-50 before:bg-ios-separator"
            >
              <TrainIcon route={arrival.route} />
              <div className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-ios-body text-ios-label">
                  {arrival.destination || `${arrival.route} ${labels.direction}`}
                </Text>
                <Text className="text-ios-footnote text-ios-secondary-label">
                  {getDirectionLabel(arrival.direction, labels)}
                </Text>
              </div>
              <span className="group relative shrink-0">
                <button
                  type="button"
                  aria-describedby={tooltipId}
                  className={cn(
                    "rounded-md px-1 text-ios-body font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50",
                    isArriving ? "text-ios-green" : "text-ios-label",
                  )}
                >
                  <time dateTime={arrival.arrivalAt}>
                    {arrival.minutes === 0 ? labels.now : `${arrival.minutes} ${labels.minutes}`}
                  </time>
                </button>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute right-0 bottom-full z-30 mb-2 hidden w-max max-w-64 rounded-ios-md bg-ios-menu px-3 py-2 text-center text-ios-footnote font-medium text-ios-label shadow-ios-floating backdrop-blur-[20px] group-focus-within:block group-hover:block"
                >
                  {arrivalFormat.format(new Date(arrival.arrivalAt))}
                </span>
              </span>
            </li>
          );
        })}
        {station.arrivals.length === 0 ? (
          <li className="relative px-4 py-3 before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:scale-y-50 before:bg-ios-separator">
            <Text className="text-ios-subheadline text-ios-secondary-label">
              {labels.noArrivals}
            </Text>
          </li>
        ) : null}
      </ul>
    </article>
  );
}

function getDirectionLabel(direction: string, labels: MtaLabels): string {
  if (direction === "Northbound") return labels.northbound;
  if (direction === "Southbound") return labels.southbound;
  return labels.service;
}
