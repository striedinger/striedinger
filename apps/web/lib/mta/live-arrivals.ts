import GtfsRealtimeBindings from "gtfs-realtime-bindings";

import stations from "../../app/mta/data/stations.json";

interface StaticStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  routes: string[];
}

export interface NearbyStation extends StaticStation {
  distance: number;
  arrivals: Array<{
    route: string;
    direction: string;
    destination: string;
    minutes: number;
    arrivalAt: string;
  }>;
}

const feedByRoute: Readonly<Record<string, string>> = {
  "1": "gtfs",
  "2": "gtfs",
  "3": "gtfs",
  "4": "gtfs",
  "5": "gtfs",
  "6": "gtfs",
  GS: "gtfs",
  "7": "gtfs",
  A: "gtfs-ace",
  C: "gtfs-ace",
  E: "gtfs-ace",
  H: "gtfs-ace",
  B: "gtfs-bdfm",
  D: "gtfs-bdfm",
  F: "gtfs-bdfm",
  M: "gtfs-bdfm",
  FS: "gtfs-bdfm",
  G: "gtfs-g",
  J: "gtfs-jz",
  Z: "gtfs-jz",
  N: "gtfs-nqrw",
  Q: "gtfs-nqrw",
  R: "gtfs-nqrw",
  W: "gtfs-nqrw",
  L: "gtfs-l",
  SI: "gtfs-si",
};

export async function getNearbyStations(
  latitude: number,
  longitude: number,
  selectedRoute?: string,
): Promise<NearbyStation[]> {
  const nearbyStations = (stations as StaticStation[])
    .filter(function servesSelectedRoute(station) {
      return (
        !selectedRoute ||
        station.routes.some(function matchesRoute(route) {
          return normalizeRoute(route) === selectedRoute;
        })
      );
    })
    .map(function addDistance(station): NearbyStation {
      return Object.assign({}, station, {
        routes: [...new Set(station.routes.map(normalizeRoute))],
        distance: distanceInMiles(latitude, longitude, station),
        arrivals: [],
      });
    })
    .toSorted(function sortByDistance(first, second) {
      return first.distance - second.distance;
    })
    .slice(0, 8);
  const nearbyStationById = new Map(
    nearbyStations.map(function indexStation(station) {
      return [station.id, station];
    }),
  );
  const feeds = new Set(
    nearbyStations.flatMap(function collectFeeds(station) {
      return station.routes.flatMap(function findFeed(route) {
        if (route === "S") return ["gtfs", "gtfs-bdfm", "gtfs-ace"];
        return feedByRoute[route] ? [feedByRoute[route]] : [];
      });
    }),
  );

  const feedResults = await Promise.all(
    [...feeds].map(async function loadFeed(feed) {
      try {
        const response = await fetch(
          `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F${feed}`,
          {
            headers: { Accept: "application/x-protobuf", "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(8_000),
            next: { revalidate: 30 },
          },
        );
        if (!response.ok) return false;
        const message = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
          new Uint8Array(await response.arrayBuffer()),
        );
        const currentTime = Date.now() / 1_000;

        for (const entity of message.entity) {
          const route = normalizeRoute(entity.tripUpdate?.trip?.routeId?.replace(/X$/, "") ?? "");
          if (!route) continue;
          for (const update of entity.tripUpdate?.stopTimeUpdate ?? []) {
            const directionalStopId = update.stopId;
            const arrivalTime = Number(update.arrival?.time ?? update.departure?.time ?? 0);
            if (
              !directionalStopId ||
              !arrivalTime ||
              arrivalTime < currentTime - 30 ||
              arrivalTime > currentTime + 7_200
            )
              continue;
            const directionCode = directionalStopId.slice(-1);
            const station = nearbyStationById.get(directionalStopId.replace(/[NS]$/, ""));
            if (!station) continue;
            station.arrivals.push({
              route,
              direction:
                directionCode === "N"
                  ? "Northbound"
                  : directionCode === "S"
                    ? "Southbound"
                    : "Service",
              destination: destinationForRoute(route, directionCode),
              minutes: Math.max(0, Math.round((arrivalTime - currentTime) / 60)),
              arrivalAt: new Date(arrivalTime * 1_000).toISOString(),
            });
          }
        }
        return true;
      } catch {
        return false;
      }
    }),
  );

  if (feeds.size > 0 && !feedResults.some(Boolean))
    throw new Error("Every MTA realtime feed failed");

  for (const station of nearbyStations) {
    station.arrivals = station.arrivals
      .toSorted(function sortByArrival(first, second) {
        return first.minutes - second.minutes;
      })
      .filter(function removeDuplicates(arrival, index, arrivals) {
        return (
          index === 0 ||
          arrival.route !== arrivals[index - 1]?.route ||
          arrival.direction !== arrivals[index - 1]?.direction ||
          arrival.minutes !== arrivals[index - 1]?.minutes
        );
      })
      .slice(0, 24);
  }
  return nearbyStations;
}

function normalizeRoute(route: string) {
  return route === "GS" || route === "FS" || route === "H" ? "S" : route;
}

function distanceInMiles(latitude: number, longitude: number, station: StaticStation) {
  const radians = Math.PI / 180;
  const latitudeDelta = (station.latitude - latitude) * radians;
  const longitudeDelta = (station.longitude - longitude) * radians;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude * radians) *
      Math.cos(station.latitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function destinationForRoute(route: string, direction: string) {
  const terminals: Readonly<Record<string, readonly [string, string]>> = {
    "1": ["Van Cortlandt Park–242 St", "South Ferry"],
    "2": ["Wakefield–241 St", "Flatbush Av–Brooklyn College"],
    "3": ["Harlem–148 St", "New Lots Av"],
    "4": ["Woodlawn", "Crown Hts–Utica Av"],
    "5": ["Eastchester–Dyre Av", "Flatbush Av–Brooklyn College"],
    "6": ["Pelham Bay Park", "Brooklyn Bridge–City Hall"],
    "7": ["Flushing–Main St", "34 St–Hudson Yards"],
    A: ["Inwood–207 St", "Far Rockaway / Lefferts Blvd"],
    C: ["168 St", "Euclid Av"],
    E: ["Jamaica Center", "World Trade Center"],
    B: ["Bedford Park Blvd", "Brighton Beach"],
    D: ["Norwood–205 St", "Coney Island–Stillwell Av"],
    F: ["Jamaica–179 St", "Coney Island–Stillwell Av"],
    M: ["Forest Hills–71 Av", "Middle Village–Metropolitan Av"],
    G: ["Court Sq", "Church Av"],
    J: ["Jamaica Center", "Broad St"],
    Z: ["Jamaica Center", "Broad St"],
    L: ["8 Av", "Canarsie–Rockaway Pkwy"],
    N: ["Astoria–Ditmars Blvd", "Coney Island–Stillwell Av"],
    Q: ["96 St", "Coney Island–Stillwell Av"],
    R: ["Forest Hills–71 Av", "Bay Ridge–95 St"],
    W: ["Astoria–Ditmars Blvd", "Whitehall St"],
  };
  const routeTerminals = terminals[route];
  return routeTerminals ? routeTerminals[direction === "N" ? 0 : 1] : "";
}
