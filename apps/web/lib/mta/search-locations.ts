import "server-only";
import { cacheLife, cacheTag } from "next/cache";

interface GeoSearchFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { label?: string; name?: string };
}

interface GeoSearchResponse {
  features?: GeoSearchFeature[];
}

export interface LocationSuggestion {
  label: string;
  latitude: number;
  longitude: number;
}

export function searchLocations(
  text: string,
  mode: "autocomplete" | "search",
): Promise<LocationSuggestion[]> {
  const normalizedText = text.trim().replace(/\s+/g, " ").slice(0, 160);
  if (normalizedText.length < 2) return Promise.resolve([]);
  return loadLocations({ mode, text: normalizedText });
}

async function loadLocations({
  mode,
  text: normalizedText,
}: {
  mode: "autocomplete" | "search";
  text: string;
}): Promise<LocationSuggestion[]> {
  "use cache";
  cacheLife({ stale: 86_400, revalidate: 86_400, expire: 604_800 });
  cacheTag("mta-location-search", `mta-location:${mode}:${normalizedText.toLowerCase()}`);

  const endpoint = new URL(`https://geosearch.planninglabs.nyc/v2/${mode}`);
  endpoint.searchParams.set("text", normalizedText);
  endpoint.searchParams.set("size", mode === "search" ? "1" : "6");
  endpoint.searchParams.set("boundary.country", "USA");
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error("Location search failed");

  const result = (await response.json()) as GeoSearchResponse;
  return (result.features ?? []).flatMap(function normalizeFeature(feature) {
    const coordinates = feature.geometry?.coordinates;
    const label = feature.properties?.label ?? feature.properties?.name;
    if (
      !coordinates ||
      !label ||
      !Number.isFinite(coordinates[0]) ||
      !Number.isFinite(coordinates[1])
    )
      return [];
    return [{ label, longitude: coordinates[0], latitude: coordinates[1] }];
  });
}
