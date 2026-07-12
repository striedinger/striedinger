import { readFileSync, writeFileSync } from "node:fs";

const sourceDirectory = process.argv[2];
const outputPath = process.argv[3];
if (!sourceDirectory || !outputPath)
  throw new Error("Usage: node generate-mta-stations.mjs <gtfs-directory> <output-path>");

const stationById = new Map();
for (const line of readFileSync(`${sourceDirectory}/stops.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [id, name, latitude, longitude, locationType] = line.trim().split(",");
  if (locationType === "1")
    stationById.set(id, {
      id,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      routes: new Set(),
    });
}

const routeByTrip = new Map();
for (const line of readFileSync(`${sourceDirectory}/trips.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [routeId, tripId] = line.trim().split(",");
  routeByTrip.set(tripId, routeId);
}

for (const line of readFileSync(`${sourceDirectory}/stop_times.txt`, "utf8")
  .trim()
  .split("\n")
  .slice(1)) {
  const [tripId, directionalStopId] = line.trim().split(",");
  const stationId = directionalStopId.replace(/[NS]$/, "");
  const station = stationById.get(stationId);
  const route = routeByTrip.get(tripId);
  if (station && route) station.routes.add(route.replace(/X$/, ""));
}

const stations = [...stationById.values()].map(function serializeStation(station) {
  station.routes = [...station.routes].toSorted((first, second) => first.localeCompare(second));
  return station;
});
writeFileSync(outputPath, `${JSON.stringify(stations)}\n`);
