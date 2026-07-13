import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";

import type { LiveStation, MtaLabels } from "./types";

import { TrainIcon } from "./train-icon";

const arrivalFormatterByLocale = new Map<string, Intl.DateTimeFormat>();

export function StationCard({
  labels,
  locale,
  station,
}: {
  labels: MtaLabels;
  locale: string;
  station: LiveStation;
}) {
  const walkingMinutes = Math.max(2, Math.round(station.distance * 20));

  return (
    <Surface as="article" className="w-full overflow-hidden transition-shadow hover:shadow-md">
      <header className="flex items-start justify-between gap-4 border-b bg-muted/30 p-5">
        <div className="flex flex-col gap-3">
          <Text as="h3" size="lg" weight="semibold">
            {station.name}
          </Text>
          <div className="flex flex-wrap gap-1.5" aria-label={station.routes.join(", ")}>
            {station.routes.map(function renderRoute(route) {
              return <TrainIcon key={route} route={route} />;
            })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Text size="sm" weight="semibold">
            {station.distance.toFixed(1)} mi
          </Text>
          <Text size="xs" tone="muted">
            {walkingMinutes} min {labels.walk}
          </Text>
        </div>
      </header>
      <div className="divide-y">
        {station.arrivals.map(function renderArrival(arrival, index) {
          const arrivalDate = new Date(arrival.arrivalAt);
          const fullArrivalTime = getArrivalFormatter(locale).format(arrivalDate);
          const tooltipId = `arrival-time-${station.id}-${index}`;
          return (
            <div
              key={`${arrival.route}-${arrival.direction}-${arrival.arrivalAt}-${index}`}
              className="flex items-center gap-3 p-4 sm:px-5"
            >
              <TrainIcon route={arrival.route} size="small" />
              <div className="min-w-0 flex-1">
                <Text size="sm" weight="medium" numberOfLines={1}>
                  {arrival.destination || `${arrival.route} ${labels.direction}`}
                </Text>
                <Text size="xs" tone="muted">
                  {getDirectionLabel(arrival.direction, labels)} · {labels.direction}
                </Text>
              </div>
              <span className="group relative shrink-0">
                <button
                  type="button"
                  aria-describedby={tooltipId}
                  className={`rounded-md px-1 py-0.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${arrival.minutes <= 2 ? "text-success" : "text-foreground"}`}
                >
                  <time dateTime={arrival.arrivalAt}>
                    {arrival.minutes === 0 ? labels.now : `${arrival.minutes} ${labels.minutes}`}
                  </time>
                </button>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute right-0 bottom-full z-30 mb-2 hidden w-max max-w-64 rounded-lg bg-black px-3 py-2 text-center text-xs leading-4 font-medium text-white shadow-xl group-focus-within:block group-hover:block dark:bg-white dark:text-black"
                >
                  {fullArrivalTime}
                  <span
                    aria-hidden="true"
                    className="absolute top-full right-4 border-4 border-transparent border-t-black dark:border-t-white"
                  />
                </span>
              </span>
            </div>
          );
        })}
        {station.arrivals.length === 0 ? (
          <div className="p-5">
            <Text size="sm" tone="muted">
              {labels.noArrivals}
            </Text>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}

function getDirectionLabel(direction: string, labels: MtaLabels): string {
  if (direction === "Northbound") return labels.northbound;
  if (direction === "Southbound") return labels.southbound;
  return labels.service;
}

function getArrivalFormatter(locale: string): Intl.DateTimeFormat {
  const existingFormatter = arrivalFormatterByLocale.get(locale);
  if (existingFormatter) return existingFormatter;

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" });
  arrivalFormatterByLocale.set(locale, formatter);
  return formatter;
}
