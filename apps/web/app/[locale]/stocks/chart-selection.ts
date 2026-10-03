import type { StockPoint } from "./types";

/** One finger scrubs to a point; two fingers compare the points between them. */
export interface ChartSelection {
  first: number;
  second: number | null;
}

/** The point under a horizontal position, given as a ratio of the chart's width. */
export function getPointIndex(ratio: number, pointCount: number) {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return Math.round(clampedRatio * Math.max(pointCount - 1, 0));
}

/** The selection for the points currently under each finger or pointer. */
export function createChartSelection(indices: readonly number[]): ChartSelection | null {
  const [first, second] = indices;
  if (first === undefined) return null;
  if (second === undefined) return { first, second: null };
  return { first: Math.min(first, second), second: Math.max(first, second) };
}

/** The change in closing price from the first selected point to the last. */
export function summarizeChartRange(points: readonly StockPoint[], first: number, last: number) {
  const startPoint = points[first];
  const endPoint = points[last];
  if (!startPoint || !endPoint) return null;
  const change = endPoint.close - startPoint.close;
  return {
    change,
    changePercent: startPoint.close === 0 ? 0 : (change / startPoint.close) * 100,
    endPoint,
    startPoint,
  };
}
