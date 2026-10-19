import type { InitialMtaState } from "./types";

import { singleSearchParam } from "../../../lib/search-params";
import { defaultLocation } from "./mta-data";

/** The location, train filter, and search query a shared /mta URL asks for. */
export function getInitialState(searchParams: Record<string, string | string[] | undefined>): {
  initialState: InitialMtaState;
  locationQuery: string;
} {
  const latitude = Number(singleSearchParam(searchParams.latitude));
  const longitude = Number(singleSearchParam(searchParams.longitude));
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;
  const locationName =
    singleSearchParam(searchParams.location)?.trim().slice(0, 160) || "Lower Manhattan";
  const requestedRoute = singleSearchParam(searchParams.train)?.trim().toUpperCase();
  return {
    initialState: {
      coordinates: hasValidCoordinates ? { latitude, longitude } : defaultLocation,
      locationName,
      selectedRoute:
        requestedRoute && /^[1-7ACEBDFMGJZLNQRWS]$/.test(requestedRoute) ? requestedRoute : null,
    },
    locationQuery:
      singleSearchParam(searchParams.q)?.trim().replace(/\s+/g, " ").slice(0, 160) ?? "",
  };
}
