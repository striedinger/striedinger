import type { InitialMtaState } from "./types";

import { defaultLocation } from "./mta-data";

/** The location, train filter, and search query a shared /mta URL asks for. */
export function getInitialState(searchParams: Record<string, string | string[] | undefined>): {
  initialState: InitialMtaState;
  locationQuery: string;
} {
  const latitude = Number(singleValue(searchParams.latitude));
  const longitude = Number(singleValue(searchParams.longitude));
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;
  const locationName =
    singleValue(searchParams.location)?.trim().slice(0, 160) || "Lower Manhattan";
  const requestedRoute = singleValue(searchParams.train)?.trim().toUpperCase();
  return {
    initialState: {
      coordinates: hasValidCoordinates ? { latitude, longitude } : defaultLocation,
      locationName,
      selectedRoute:
        requestedRoute && /^[1-7ACEBDFMGJZLNQRWS]$/.test(requestedRoute) ? requestedRoute : null,
    },
    locationQuery: singleValue(searchParams.q)?.trim().replace(/\s+/g, " ").slice(0, 160) ?? "",
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
