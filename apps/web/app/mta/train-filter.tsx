import { Button } from "@workspace/ui/components/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { Text } from "@workspace/ui/components/text";

import type { MtaLabels } from "./types";

import { TrainIcon } from "./train-icon";

interface TrainFilterProps {
  labels: MtaLabels;
  routes: readonly string[];
  selectedRoute: string | null;
  onSelectRoute: (route: string | null) => void;
}

const carouselOptions = { align: "start", dragFree: true } as const;

export function TrainFilter({ labels, onSelectRoute, routes, selectedRoute }: TrainFilterProps) {
  const availableRoutes = new Set(routes);
  return (
    <div className="flex flex-col gap-3" aria-label={labels.filterByTrain}>
      <div className="flex items-center justify-between gap-3">
        <Text size="xs" weight="medium" tone="muted">
          {labels.filterByTrain}
        </Text>
        <Text size="xs" tone="muted">
          {selectedRoute ?? labels.allTrains}
        </Text>
      </div>
      <Carousel aria-label={labels.filterByTrain} className="group/carousel" opts={carouselOptions}>
        <CarouselContent className="-ml-2 px-1 py-1.5">
          <CarouselItem className="basis-auto pl-2">
            <Button
              type="button"
              size="sm"
              variant={selectedRoute === null ? "default" : "outline"}
              aria-pressed={selectedRoute === null}
              onClick={function selectAllTrains() {
                onSelectRoute(null);
              }}
              className="h-10 rounded-full px-4 shadow-none"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {labels.allTrains}
            </Button>
          </CarouselItem>
          {routeGroups.map(function renderRouteGroup(group) {
            const groupRoutes = group.routes.filter(function routeIsAvailable(route) {
              return availableRoutes.has(route);
            });
            if (groupRoutes.length === 0) return null;
            return (
              <CarouselItem key={group.color} className="basis-auto pl-2">
                <div className="relative flex items-center gap-1 rounded-full border bg-card px-1.5 py-1 shadow-xs">
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 right-4 left-4 h-1 -translate-y-1/2 rounded-full ${group.trackClass}`}
                  />
                  {groupRoutes.map(function renderRouteFilter(route) {
                    const isSelected = selectedRoute === route;
                    return (
                      <Button
                        key={route}
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`${labels.filterByTrain}: ${route}`}
                        aria-pressed={isSelected}
                        onClick={function selectRoute() {
                          onSelectRoute(isSelected ? null : route);
                        }}
                        className={`relative z-10 rounded-full p-0 hover:bg-transparent ${isSelected ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-card" : "opacity-75 hover:scale-105 hover:opacity-100"}`}
                      >
                        <TrainIcon route={route} />
                      </Button>
                    );
                  })}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious
          className="pointer-events-none left-2 z-20 bg-card/95 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover/carousel:pointer-events-auto group-hover/carousel:opacity-100 focus-visible:opacity-100"
          aria-label={labels.previousTrains}
        />
        <CarouselNext
          className="pointer-events-none right-2 z-20 bg-card/95 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-150 group-hover/carousel:pointer-events-auto group-hover/carousel:opacity-100 focus-visible:opacity-100"
          aria-label={labels.nextTrains}
        />
      </Carousel>
    </div>
  );
}

const routeGroups = [
  { color: "red", trackClass: "bg-[#EE352E]", routes: ["1", "2", "3"] },
  { color: "green", trackClass: "bg-[#00933C]", routes: ["4", "5", "6"] },
  { color: "purple", trackClass: "bg-[#B933AD]", routes: ["7"] },
  { color: "blue", trackClass: "bg-[#0039A6]", routes: ["A", "C", "E"] },
  { color: "orange", trackClass: "bg-[#FF6319]", routes: ["B", "D", "F", "M"] },
  { color: "lime", trackClass: "bg-[#6CBE45]", routes: ["G"] },
  { color: "brown", trackClass: "bg-[#996633]", routes: ["J", "Z"] },
  { color: "gray", trackClass: "bg-[#A7A9AC]", routes: ["L", "S"] },
  { color: "yellow", trackClass: "bg-[#FCCC0A]", routes: ["N", "Q", "R", "W"] },
] as const;
