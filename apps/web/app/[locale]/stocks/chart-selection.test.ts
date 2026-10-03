import { describe, expect, it } from "vitest";

import { createChartSelection, getPointIndex, summarizeChartRange } from "./chart-selection";

function createPoint(close: number) {
  return { close, date: "2026-01-01T00:00:00Z", high: close, low: close, open: close, volume: 1 };
}

describe("chart selection", function () {
  it("maps a position across the chart to the nearest point", function () {
    expect(getPointIndex(0, 5)).toBe(0);
    expect(getPointIndex(0.49, 5)).toBe(2);
    expect(getPointIndex(1.4, 5)).toBe(4);
  });

  it("orders two fingers from left to right", function () {
    expect(createChartSelection([])).toBeNull();
    expect(createChartSelection([3])).toEqual({ first: 3, second: null });
    expect(createChartSelection([7, 2])).toEqual({ first: 2, second: 7 });
  });

  it("measures the change between two points", function () {
    const points = [createPoint(100), createPoint(90), createPoint(125)];

    expect(summarizeChartRange(points, 0, 2)).toMatchObject({ change: 25, changePercent: 25 });
    expect(summarizeChartRange(points, 2, 9)).toBeNull();
  });
});
