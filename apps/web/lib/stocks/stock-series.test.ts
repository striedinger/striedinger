import { describe, expect, it } from "vitest";

import type { StockPoint } from "../../app/stocks/types";

import { getLatestTradingDayPoints } from "./stock-series";

describe("getLatestTradingDayPoints", function () {
  it("keeps only the partial newest trading day", function () {
    const points = [
      createPoint("2026-07-16 15:55:00"),
      createPoint("2026-07-16 16:00:00"),
      createPoint("2026-07-17 09:30:00"),
      createPoint("2026-07-17 09:35:00"),
    ];

    expect(getLatestTradingDayPoints(points)).toEqual(points.slice(2));
  });

  it("keeps the first candle of a newly opened trading day", function () {
    const points = [createPoint("2026-07-16 16:00:00"), createPoint("2026-07-17 09:30:00")];

    expect(getLatestTradingDayPoints(points)).toEqual([points[1]]);
  });

  it("leaves values unchanged when the provider date format is unknown", function () {
    const points = [createPoint("unknown"), createPoint("also-unknown")];

    expect(getLatestTradingDayPoints(points)).toEqual(points);
  });
});

function createPoint(date: string): StockPoint {
  return { date, open: 100, high: 102, low: 99, close: 101, volume: 1_000 };
}
