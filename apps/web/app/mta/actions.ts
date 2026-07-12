"use server";

import { headers } from "next/headers";

import { getNearbyStations } from "../../lib/mta/live-arrivals";
import { searchLocations } from "../../lib/mta/search-locations";
import { isRateLimited } from "../../lib/rate-limit";

const supportedRoutes = new Set([
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
]);

export async function loadNearbyStations(
  latitude: number,
  longitude: number,
  selectedRoute: string | null,
) {
  if (!validCoordinates(latitude, longitude)) throw new Error("Invalid coordinates");
  if (selectedRoute !== null && !supportedRoutes.has(selectedRoute))
    throw new Error("Invalid route");
  await enforceMtaRateLimit("arrivals", 12);
  const stations = await getNearbyStations(latitude, longitude, selectedRoute ?? undefined);
  return { stations, updatedAt: new Date().toISOString() };
}

export async function autocompleteLocations(text: string) {
  await enforceMtaRateLimit("autocomplete", 30);
  return searchLocations(text, "autocomplete");
}

export async function resolveLocation(text: string) {
  await enforceMtaRateLimit("search", 10);
  return searchLocations(text, "search");
}

async function enforceMtaRateLimit(scope: string, maximumRequests: number) {
  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  if (
    await isRateLimited({
      identifier,
      maximumRequests,
      scope: `mta-${scope}`,
      windowMilliseconds: 60_000,
    })
  ) {
    throw new Error("Rate limit exceeded");
  }
}

function validCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}
