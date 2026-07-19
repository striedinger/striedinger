import type { StockPoint } from "../../app/stocks/types";

export function getLatestTradingDayPoints(points: StockPoint[]) {
  const latestPoint = points.at(-1);
  if (!latestPoint) return points;

  const latestTradingDate = getTradingDate(latestPoint.date);
  if (!latestTradingDate) return points;

  return points.filter(function isFromLatestTradingDay(point) {
    return getTradingDate(point.date) === latestTradingDate;
  });
}

function getTradingDate(dateTime: string) {
  return dateTime.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
}
