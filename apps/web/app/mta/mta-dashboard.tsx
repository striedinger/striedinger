"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useMemo, useRef, type FormEvent } from "react";

import type { InitialMtaState, LiveStation, LocationSuggestion, MtaLabels } from "./types";

import { useTypeahead } from "../../components/use-typeahead";
import { autocompleteLocations, loadNearbyStations, resolveLocation } from "./actions";
import { StationGrid } from "./station-grid";
import { TrainFilter } from "./train-filter";
import { useMtaDashboard } from "./use-mta-dashboard";

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

function getLocationLabel(suggestion: LocationSuggestion) {
  return suggestion.label;
}

interface MtaDashboardProps {
  initialState: InitialMtaState;
  initialStations: LiveStation[];
  initialUpdatedAt: string;
  labels: MtaLabels;
  locale: string;
}

export function MtaDashboard({
  initialState,
  initialStations,
  initialUpdatedAt,
  labels,
  locale,
}: MtaDashboardProps) {
  const [state, dispatch] = useMtaDashboard({ initialState, initialStations, initialUpdatedAt });
  const {
    arrivalState,
    coordinates,
    loadedRoute,
    locationName,
    locationState,
    nearbyStations,
    query,
    refreshVersion,
    selectedRoute,
    updatedAt,
  } = state;
  const isInitialArrivalRender = useRef(true);
  const typeahead = useTypeahead({
    getItemLabel: getLocationLabel,
    loadResults: resolveLocation,
    loadSuggestions: autocompleteLocations,
    minimumQueryLength: 1,
    minimumSuggestionLength: 3,
    onQueryChange: function updateLocationQuery(nextQuery) {
      dispatch({ type: "query-changed", query: nextQuery });
    },
    onResults: function selectFirstResult(results) {
      const firstResult = results[0];
      if (firstResult) selectSuggestion(firstResult);
    },
    onSelect: function selectLocation(suggestion) {
      dispatch({ type: "location-selected", suggestion });
    },
    query,
    suggestionDelayMilliseconds: 350,
  });
  const {
    activateSuggestion,
    activeSuggestionIndex,
    handleKeyDown,
    open,
    selectSuggestion,
    setQuery,
    status: searchStatus,
    submit,
    suggestions,
  } = typeahead;

  useEffect(
    function refreshArrivalsEveryMinute() {
      const intervalId = window.setInterval(function refreshArrivals() {
        if (document.visibilityState === "visible") dispatch({ type: "refresh-requested" });
      }, 60_000);
      return function stopRefreshing() {
        window.clearInterval(intervalId);
      };
    },
    [dispatch],
  );

  useEffect(
    function keepLocationStateInUrl() {
      const url = new URL(window.location.href);
      url.searchParams.set("latitude", coordinates.latitude.toFixed(6));
      url.searchParams.set("longitude", coordinates.longitude.toFixed(6));
      url.searchParams.set("location", locationName);
      if (selectedRoute) url.searchParams.set("train", selectedRoute);
      else url.searchParams.delete("train");
      window.history.replaceState(window.history.state, "", url);
    },
    [coordinates, locationName, selectedRoute],
  );

  useEffect(
    function loadLiveArrivals() {
      if (isInitialArrivalRender.current) {
        isInitialArrivalRender.current = false;
        return;
      }
      let cancelled = false;
      loadNearbyStations(coordinates.latitude, coordinates.longitude, selectedRoute)
        .then(function showLiveArrivals(result) {
          if (!cancelled)
            dispatch({
              type: "arrival-loaded",
              stations: result.stations,
              updatedAt: result.updatedAt,
              route: selectedRoute,
            });
          return undefined;
        })
        .catch(function showArrivalError() {
          if (!cancelled) dispatch({ type: "arrival-failed" });
        });
      return function ignoreStaleArrivals() {
        cancelled = true;
      };
    },
    [coordinates, dispatch, refreshVersion, selectedRoute],
  );

  const displayedStations = useMemo(
    function filterStationsByRoute() {
      return nearbyStations.flatMap(function filterStation(station) {
        if (loadedRoute && !station.routes.includes(loadedRoute)) return [];
        const arrivals = loadedRoute
          ? station.arrivals
              .filter(function matchesSelectedRoute(arrival) {
                return arrival.route === loadedRoute;
              })
              .slice(0, 16)
          : station.arrivals.slice(0, 8);
        return [{ ...station, arrivals }];
      });
    },
    [nearbyStations, loadedRoute],
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (open && suggestions[activeSuggestionIndex]) {
      selectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }
    await submit();
  }

  function detectLocation() {
    dispatch({ type: "location-detection-requested" });
    if (!("geolocation" in navigator)) {
      dispatch({ type: "location-detection-failed" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function useDetectedLocation(position) {
        dispatch({
          type: "location-detected",
          coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          locationName: labels.currentLocation,
        });
      },
      function showLocationError() {
        dispatch({ type: "location-detection-failed" });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <Surface as="section" className="p-5 sm:p-6" aria-labelledby="location-heading">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <Text as="h2" id="location-heading" size="sm" weight="semibold">
              {labels.locationLabel}
            </Text>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <Input
                id="mta-location"
                value={query}
                onChange={function updateQuery(event) {
                  setQuery(event.currentTarget.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={labels.locationPlaceholder}
                aria-label={labels.locationLabel}
                aria-busy={searchStatus === "loading"}
                role="combobox"
                tabIndex={0}
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="mta-location-suggestions"
                aria-activedescendant={
                  activeSuggestionIndex >= 0 ? `mta-suggestion-${activeSuggestionIndex}` : undefined
                }
                maxLength={160}
                className="h-11 rounded-xl bg-background pl-12 shadow-none"
              />
              {open ? (
                <div
                  id="mta-location-suggestions"
                  className="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-xl border bg-popover py-1 text-popover-foreground shadow-xl"
                  role="listbox"
                  aria-label={labels.locationLabel}
                >
                  {suggestions.map(function renderSuggestion(suggestion, suggestionIndex) {
                    return (
                      <button
                        id={`mta-suggestion-${suggestionIndex}`}
                        key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.label}`}
                        type="button"
                        role="option"
                        aria-selected={activeSuggestionIndex === suggestionIndex}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent focus:bg-accent focus:outline-none aria-selected:bg-accent"
                        onMouseEnter={function highlightSuggestion() {
                          activateSuggestion(suggestionIndex);
                        }}
                        onClick={function chooseSuggestion() {
                          selectSuggestion(suggestion);
                        }}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        >
                          <path
                            d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
                            strokeWidth="2"
                          />
                          <circle cx="12" cy="10" r="2.5" strokeWidth="2" />
                        </svg>
                        <Text as="span" size="sm">
                          {suggestion.label}
                        </Text>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              className="h-11 rounded-xl px-5"
              onClick={detectLocation}
              loading={locationState === "loading"}
              loadingLabel={labels.locating}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {labels.useLocation}
            </Button>
          </form>
          <Text
            size="xs"
            tone={locationState === "error" || searchStatus === "error" ? "destructive" : "muted"}
          >
            {locationState === "error"
              ? labels.locationError
              : searchStatus === "error"
                ? labels.searchError
                : labels.searchHint}
          </Text>
        </div>
      </Surface>

      <section className="flex flex-col gap-5" aria-labelledby="nearby-heading">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <Text as="h2" id="nearby-heading" size="2xl" weight="semibold">
              {labels.nearbyStops}
            </Text>
            <Text size="sm" tone="muted">
              {locationName}
            </Text>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-2 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
            <Text size="xs" tone="muted">
              {labels.updated}{" "}
              {updatedAt.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} ·{" "}
              {labels.refreshes}
            </Text>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={labels.refresh}
              loading={arrivalState === "loading"}
              onClick={function refreshNow() {
                dispatch({ type: "refresh-requested" });
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M20 6v5h-5M4 18v-5h5M18.5 9a7 7 0 0 0-12-2L4 11m16 2-2.5 4a7 7 0 0 1-12-2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </div>

        <TrainFilter
          labels={labels}
          routes={subwayRoutes}
          selectedRoute={selectedRoute}
          onSelectRoute={function selectRoute(route) {
            dispatch({ type: "route-selected", route });
          }}
        />
        {arrivalState === "error" ? <Text tone="destructive">{labels.arrivalError}</Text> : null}
        <StationGrid labels={labels} locale={locale} stations={displayedStations} />
      </section>
    </div>
  );
}
