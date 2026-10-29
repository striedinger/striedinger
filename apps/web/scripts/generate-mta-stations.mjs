import { readFileSync, writeFileSync } from "node:fs";

const sourceDirectory = process.argv[2];
const outputPath = process.argv[3];
if (!sourceDirectory || !outputPath)
  throw new Error("Usage: node generate-mta-stations.mjs <gtfs-directory> <output-path>");

/** @type {Map<string, { id: string; name: string; latitude: number; longitude: number; routes: Set<string> }>} */
const stationById = new Map();
for (const line of readFileSync(`${sourceDirectory}/stops.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [id, name, latitude, longitude, locationType] = line.trim().split(",");
  if (locationType === "1" && id !== undefined && name !== undefined)
    stationById.set(id, {
      id,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      routes: new Set(),
    });
}

/** @type {Map<string, string>} */
const routeByTrip = new Map();
for (const line of readFileSync(`${sourceDirectory}/trips.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [routeId, tripId] = line.trim().split(",");
  if (routeId !== undefined && tripId !== undefined) routeByTrip.set(tripId, routeId);
}

for (const line of readFileSync(`${sourceDirectory}/stop_times.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [tripId, directionalStopId] = line.trim().split(",");
  if (!tripId || !directionalStopId) continue;
  const stationId = directionalStopId.replace(/[NS]$/, "");
  const station = stationById.get(stationId);
  const route = routeByTrip.get(tripId);
  if (station && route) station.routes.add(route.replace(/X$/, ""));
}

const stations = [...stationById.values()].map(function serializeStation(station) {
  return {
    id: station.id,
    name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    routes: [...station.routes].toSorted((first, second) => first.localeCompare(second)),
  };
});
writeFileSync(outputPath, `${JSON.stringify(stations)}\n`);
