"use client";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { ChartRange } from "./chart-range";
import type { StockPoint, StocksLabels, StockTimeframe } from "./types";

import { getDraggedRange } from "./chart-range";
interface StockChartProps {
  currency: string;
  labels: StocksLabels;
  locale: string;
  points: StockPoint[];
  symbol: string;
  timeframe: StockTimeframe;
}

const chartWidth = 800;
const chartHeight = 340;
const chartTop = 20;
const chartBottom = 300;

export function StockChart({
  currency,
  labels,
  locale,
  points,
  symbol,
  timeframe,
}: StockChartProps) {
  const [activeIndex, setActiveIndex] = useState(points.length - 1);
  const [visibleRange, setVisibleRange] = useState<ChartRange>({
    start: 0,
    end: points.length - 1,
  });
  const [dragSelection, setDragSelection] = useState<{ end: number; start: number } | null>(null);
  const dragSelectionRef = useRef<{ end: number; start: number } | null>(null);
  const activePointer = useRef<number | null>(null);
  const visiblePoints = useMemo(
    function selectVisiblePoints() {
      return points.slice(visibleRange.start, visibleRange.end + 1);
    },
    [points, visibleRange],
  );
  const visibleIndex = Math.max(visibleRange.start, Math.min(activeIndex, visibleRange.end));
  const activePoint = points[visibleIndex] ?? points.at(-1)!;
  const { areaPath, coordinates, isPositive, linePath } = useMemo(
    function createChartModel() {
      const values = visiblePoints.map(function selectClose(point) {
        return point.close;
      });
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      const priceRange = maximum - minimum || 1;
      const nextCoordinates = visiblePoints.map(function createCoordinate(point, index) {
        const x = (index / Math.max(visiblePoints.length - 1, 1)) * chartWidth;
        const y = chartBottom - ((point.close - minimum) / priceRange) * (chartBottom - chartTop);
        return { x, y };
      });
      const nextLinePath = nextCoordinates
        .map(function createPathSegment(point, index) {
          return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
        })
        .join(" ");
      return {
        areaPath: `${nextLinePath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`,
        coordinates: nextCoordinates,
        isPositive: visiblePoints.at(-1)!.close >= visiblePoints[0]!.close,
        linePath: nextLinePath,
      };
    },
    [visiblePoints],
  );
  const activeCoordinate = coordinates[visibleIndex - visibleRange.start] ?? coordinates.at(-1)!;
  const priceFormatter = useMemo(
    function createPriceFormatter() {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: activePoint.close < 10 ? 3 : 2,
      });
    },
    [activePoint.close, currency, locale],
  );
  const dateFormatter = useMemo(
    function createDateFormatter() {
      return new Intl.DateTimeFormat(locale, getDateFormat(timeframe));
    },
    [locale, timeframe],
  );

  function selectPointFromPointer(event: PointerEvent<SVGSVGElement>) {
    const ratio = getPointerRatio(event);
    setActiveIndex(visibleRange.start + Math.round(ratio * Math.max(visiblePoints.length - 1, 0)));
  }

  function startRangeSelection(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    const ratio = getPointerRatio(event);
    const selection = { start: ratio, end: ratio };
    dragSelectionRef.current = selection;
    setDragSelection(selection);
  }

  function updateRangeSelection(event: PointerEvent<SVGSVGElement>) {
    if (activePointer.current !== event.pointerId) {
      if (event.pointerType === "mouse") selectPointFromPointer(event);
      return;
    }
    const selection = dragSelectionRef.current;
    if (!selection) return;
    const nextSelection = { ...selection, end: getPointerRatio(event) };
    dragSelectionRef.current = nextSelection;
    setDragSelection(nextSelection);
  }

  function finishRangeSelection(event: PointerEvent<SVGSVGElement>) {
    if (activePointer.current !== event.pointerId) return;
    const selection = dragSelectionRef.current;
    if (selection && Math.abs(selection.end - selection.start) >= 0.035) {
      const nextRange = getDraggedRange(
        visibleRange,
        selection.start,
        selection.end,
        points.length,
      );
      setVisibleRange(nextRange);
      setActiveIndex(nextRange.end);
    } else {
      selectPointFromPointer(event);
    }
    activePointer.current = null;
    dragSelectionRef.current = null;
    setDragSelection(null);
  }

  function cancelRangeSelection() {
    activePointer.current = null;
    dragSelectionRef.current = null;
    setDragSelection(null);
  }

  function resetRange() {
    setVisibleRange({ start: 0, end: points.length - 1 });
    setActiveIndex(points.length - 1);
  }

  function selectPointFromKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    event.preventDefault();
    if (event.key === "Home") setActiveIndex(visibleRange.start);
    else if (event.key === "End") setActiveIndex(visibleRange.end);
    else {
      setActiveIndex(function moveActivePoint(index) {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        return Math.max(visibleRange.start, Math.min(visibleRange.end, index + direction));
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid h-[4.5rem] grid-cols-1 content-start gap-1 overflow-hidden sm:h-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-2"
        aria-live="polite"
      >
        <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
          <Text
            as="span"
            size="2xl"
            weight="semibold"
            className="min-w-[8ch] shrink-0 tabular-nums"
          >
            {priceFormatter.format(activePoint.close)}
          </Text>
          <Text as="span" size="xs" tone="muted" className="truncate whitespace-nowrap">
            {dateFormatter.format(new Date(activePoint.date))}
          </Text>
        </div>
        <Text
          size="xs"
          tone="muted"
          className="truncate whitespace-nowrap sm:max-w-[22rem] sm:text-right"
        >
          {labels.open} {priceFormatter.format(activePoint.open)} · {labels.high}{" "}
          {priceFormatter.format(activePoint.high)} · {labels.low}{" "}
          {priceFormatter.format(activePoint.low)}
        </Text>
      </div>

      <div className="relative -mx-2 overflow-hidden rounded-xl sm:mx-0">
        <span id={`${symbol}-chart-help`} className="sr-only">
          {labels.chartHelp} {labels.rangeHelp}
        </span>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="slider"
          aria-label={`${symbol} ${labels.chart}`}
          aria-describedby={`${symbol}-chart-help`}
          aria-valuemin={visibleRange.start}
          aria-valuemax={visibleRange.end}
          aria-valuenow={visibleIndex}
          aria-valuetext={`${priceFormatter.format(activePoint.close)}, ${dateFormatter.format(new Date(activePoint.date))}`}
          tabIndex={0}
          className="block aspect-[1.5/1] w-full cursor-crosshair touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:aspect-[2.35/1]"
          onPointerDown={startRangeSelection}
          onPointerMove={updateRangeSelection}
          onPointerUp={finishRangeSelection}
          onPointerCancel={cancelRangeSelection}
          onKeyDown={selectPointFromKeyboard}
          onPointerLeave={function showLatestPoint(event) {
            if (event.pointerType === "mouse" && activePointer.current === null)
              setActiveIndex(visibleRange.end);
          }}
        >
          <defs>
            <linearGradient id={`stock-area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.4, 0.6, 0.8].map(function renderGridLine(ratio) {
            return (
              <line
                key={ratio}
                x1="0"
                x2={chartWidth}
                y1={chartTop + (chartBottom - chartTop) * ratio}
                y2={chartTop + (chartBottom - chartTop) * ratio}
                stroke="var(--border)"
                strokeDasharray="4 8"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <path d={areaPath} fill={`url(#stock-area-${symbol})`} />
          <path
            d={linePath}
            fill="none"
            stroke={isPositive ? "var(--success)" : "var(--destructive)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {dragSelection ? (
            <g stroke="var(--primary)" strokeWidth="2.5">
              <line
                x1={dragSelection.start * chartWidth}
                x2={dragSelection.start * chartWidth}
                y1={chartTop}
                y2={chartBottom}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={dragSelection.end * chartWidth}
                x2={dragSelection.end * chartWidth}
                y1={chartTop}
                y2={chartBottom}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : (
            <>
              <line
                x1={activeCoordinate.x}
                x2={activeCoordinate.x}
                y1={chartTop}
                y2={chartBottom}
                stroke="var(--foreground)"
                strokeOpacity="0.28"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                x2={chartWidth}
                y1={activeCoordinate.y}
                y2={activeCoordinate.y}
                stroke="var(--foreground)"
                strokeOpacity="0.2"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activeCoordinate.x}
                cy={activeCoordinate.y}
                r="7"
                fill="var(--card)"
                stroke={isPositive ? "var(--success)" : "var(--destructive)"}
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
        <Text
          as="span"
          size="xs"
          weight="semibold"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-card/90 px-2 py-1 tabular-nums shadow-sm sm:hidden"
          style={{
            left: `${(activeCoordinate.x / chartWidth) * 100}%`,
            top: `${(activeCoordinate.y / chartHeight) * 100}%`,
          }}
          aria-hidden="true"
        >
          {priceFormatter.format(activePoint.close)}
        </Text>
        {visibleRange.start === 0 && visibleRange.end === points.length - 1 ? (
          <Text
            size="xs"
            tone="muted"
            className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-card/75 px-2 py-1 backdrop-blur-sm"
          >
            {labels.rangeHelp}
          </Text>
        ) : (
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="absolute right-3 bottom-2 rounded-full bg-card/90 backdrop-blur-sm"
            onClick={resetRange}
          >
            {labels.resetZoom}
          </Button>
        )}
      </div>
    </div>
  );
}

function getPointerRatio(event: PointerEvent<SVGSVGElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
}

function getDateFormat(timeframe: StockTimeframe): Intl.DateTimeFormatOptions {
  if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
    return { weekday: "short", hour: "numeric", minute: "2-digit" };
  }
  if (timeframe === "MAX" || timeframe === "5Y") return { month: "short", year: "numeric" };
  return { month: "short", day: "numeric", year: "numeric" };
}
