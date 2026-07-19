export interface ChartRange {
  end: number;
  start: number;
}

const minimumVisiblePoints = 12;

export function getDraggedRange(
  range: ChartRange,
  startRatio: number,
  endRatio: number,
  totalPoints: number,
): ChartRange {
  const minimumLength = Math.min(minimumVisiblePoints, totalPoints);
  const currentLength = range.end - range.start + 1;
  const firstRatio = Math.max(0, Math.min(1, Math.min(startRatio, endRatio)));
  const secondRatio = Math.max(0, Math.min(1, Math.max(startRatio, endRatio)));
  const requestedStart = range.start + Math.round(firstRatio * Math.max(currentLength - 1, 0));
  const requestedEnd = range.start + Math.round(secondRatio * Math.max(currentLength - 1, 0));
  if (requestedEnd - requestedStart + 1 >= minimumLength) {
    return { start: requestedStart, end: requestedEnd };
  }
  const center = (requestedStart + requestedEnd) / 2;
  const start = Math.max(
    range.start,
    Math.min(range.end - minimumLength + 1, Math.round(center - (minimumLength - 1) / 2)),
  );
  return { start, end: start + minimumLength - 1 };
}
