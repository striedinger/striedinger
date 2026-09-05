import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { afterEach, describe, expect, it, vi } from "vitest";

import stations from "../../app/mta/data/stations.json";
import { getNearbyStations } from "./live-arrivals";

vi.mock("next/cache", function mockCache() {
  return { cacheLife: vi.fn<() => void>(), cacheTag: vi.fn<() => void>() };
});

afterEach(function restoreEnvironment() {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("MTA arrivals", function () {
  it("deduplicates identical arrivals but keeps separate trains within the same minute", async function () {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const station = stations[0]!;
    const now = Date.now() / 1_000;
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({
      header: { gtfsRealtimeVersion: "2.0" },
      entity: [60, 60, 70].map(function createTrain(offset, index) {
        return {
          id: String(index),
          tripUpdate: {
            trip: { tripId: String(index), routeId: station.routes[0] },
            stopTimeUpdate: [{ stopId: `${station.id}N`, arrival: { time: now + offset } }],
          },
        };
      }),
    }).finish();
    vi.stubGlobal(
      "fetch",
      vi.fn(async function fetchFeed() {
        return new Response(new Uint8Array(feed).buffer);
      }),
    );
    const nearby = await getNearbyStations(station.latitude, station.longitude);
    const arrivals = nearby.find(function matchStation(item) {
      return item.id === station.id;
    })!.arrivals;
    expect(
      arrivals.map(function arrivalTime(item) {
        return item.arrivalAt;
      }),
    ).toEqual(["2026-09-05T12:01:00.000Z", "2026-09-05T12:01:10.000Z"]);
  });

  it("reports total feed failure rather than claiming no trains are due", async function () {
    vi.stubGlobal(
      "fetch",
      vi.fn(async function failFeed() {
        return new Response(null, { status: 503 });
      }),
    );
    await expect(getNearbyStations(40.7128, -74.006)).rejects.toThrow(
      "Every MTA realtime feed failed",
    );
  });
});
