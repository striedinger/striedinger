"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import type { StockPoint, StocksLabels, StockTimeframe } from "./types";

import { getDateTimeFormat, getNumberFormat } from "../../../lib/intl-cache";
import {
  createChartSelection,
  getPointIndex,
  summarizeChartRange,
  type ChartSelection,
} from "./chart-selection";
import { playStockHaptic } from "./haptics";

interface StockChartProps {
  currency: string;
  labels: StocksLabels;
  locale: string;
  points: StockPoint[];
  symbol: string;
  timeframe: StockTimeframe;
}

const chartWidth = 800;
const chartHeight = 320;
const chartTop = 16;
const chartBottom = 304;

/**
 * The price chart, with the gestures of the iOS Stocks app: touch and drag to read the price
 * at any moment, or rest two fingers on the chart to see the change between them. A mouse
 * reads prices on hover and the arrow keys step through points.
 */
function preventLongPressMenu(event: MouseEvent<SVGSVGElement>) {
  event.preventDefault();
}

export function StockChart({
  currency,
  labels,
  locale,
  points,
  symbol,
  timeframe,
}: StockChartProps) {
  const [selection, setSelection] = useState<ChartSelection | null>(null);
  const pointerIndices = useRef(new Map<number, number>());
  const lastIndex = points.length - 1;
  const priceFormat = getNumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: (points[lastIndex]?.close ?? 0) < 10 ? 3 : 2,
  });
  const dateFormat = getDateTimeFormat(locale, getDateFormat(timeframe));
  const model = useMemo(
    function createChartModel() {
      const closes = points.map(function selectClose(point) {
        return point.close;
      });
      const minimum = Math.min(...closes);
      const maximum = Math.max(...closes);
      const priceRange = maximum - minimum || 1;
      function getY(price: number) {
        return chartBottom - ((price - minimum) / priceRange) * (chartBottom - chartTop);
      }
      const coordinates = points.map(function createCoordinate(point, index) {
        return { x: (index / Math.max(lastIndex, 1)) * chartWidth, y: getY(point.close) };
      });
      return {
        baselineY: getY(points[0]?.close ?? minimum),
        coordinates,
        isPositive: (points[lastIndex]?.close ?? 0) >= (points[0]?.close ?? 0),
        maximum,
        minimum,
      };
    },
    [lastIndex, points],
  );
  const lineColor = model.isPositive ? "var(--ios-green)" : "var(--ios-red)";
  const range =
    selection && selection.second !== null
      ? summarizeChartRange(points, selection.first, selection.second)
      : null;
  const rangeColor = range && range.change < 0 ? "var(--ios-red)" : "var(--ios-green)";
  const scrubIndex = selection && selection.second === null ? selection.first : null;
  const displayedIndex = scrubIndex ?? lastIndex;
  const displayedPoint = points[displayedIndex] ?? points[lastIndex]!;

  function readPointIndex(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return getPointIndex((event.clientX - bounds.left) / bounds.width, points.length);
  }

  function showPointerSelection() {
    setSelection(createChartSelection([...pointerIndices.current.values()]));
  }

  function startSelection(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIndices.current.set(event.pointerId, readPointIndex(event));
    showPointerSelection();
    if (event.pointerType !== "mouse") playStockHaptic("select");
  }

  function moveSelection(event: PointerEvent<SVGSVGElement>) {
    if (!pointerIndices.current.has(event.pointerId)) {
      // A mouse reads prices by hovering, without pressing.
      if (event.pointerType === "mouse" && pointerIndices.current.size === 0) {
        setSelection({ first: readPointIndex(event), second: null });
      }
      return;
    }
    const index = readPointIndex(event);
    if (pointerIndices.current.get(event.pointerId) === index) return;
    pointerIndices.current.set(event.pointerId, index);
    showPointerSelection();
  }

  function endSelection(event: PointerEvent<SVGSVGElement>) {
    pointerIndices.current.delete(event.pointerId);
    showPointerSelection();
  }

  function clearHover(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && pointerIndices.current.size === 0) setSelection(null);
  }

  function selectPointFromKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (event.key === "Escape") {
      setSelection(null);
      return;
    }
    let nextIndex: number | null = null;
    if (event.key in steps) nextIndex = displayedIndex + (steps[event.key] ?? 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;
    if (nextIndex === null) return;
    event.preventDefault();
    setSelection({ first: Math.max(0, Math.min(lastIndex, nextIndex)), second: null });
  }

  function createLinePath(first: number, last: number) {
    return model.coordinates
      .slice(first, last + 1)
      .map(function createSegment(point, index) {
        return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      })
      .join(" ");
  }

  function createAreaPath(first: number, last: number) {
    const startX = model.coordinates[first]?.x ?? 0;
    const endX = model.coordinates[last]?.x ?? chartWidth;
    return `${createLinePath(first, last)} L${endX},${chartHeight} L${startX},${chartHeight} Z`;
  }

  const scrubCoordinate = scrubIndex === null ? null : model.coordinates[scrubIndex];
  const fullLinePath = createLinePath(0, lastIndex);

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite" className="flex h-11 flex-col justify-center">
        {range ? (
          <>
            <Text
              className="text-[17px] leading-[22px] font-semibold tabular-nums"
              style={{ color: rangeColor }}
            >
              {range.change >= 0 ? "+" : ""}
              {priceFormat.format(range.change)} ({range.changePercent >= 0 ? "+" : ""}
              {range.changePercent.toFixed(2)}%)
            </Text>
            <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label) tabular-nums">
              {dateFormat.format(new Date(range.startPoint.date))} –{" "}
              {dateFormat.format(new Date(range.endPoint.date))}
            </Text>
          </>
        ) : (
          <>
            <Text className="text-[17px] leading-[22px] font-semibold text-(--ios-label) tabular-nums">
              {priceFormat.format(displayedPoint.close)}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[13px] leading-[18px] text-(--ios-secondary-label) tabular-nums"
            >
              {dateFormat.format(new Date(displayedPoint.date))} · {labels.open}{" "}
              {priceFormat.format(displayedPoint.open)} · {labels.high}{" "}
              {priceFormat.format(displayedPoint.high)} · {labels.low}{" "}
              {priceFormat.format(displayedPoint.low)}
            </Text>
          </>
        )}
      </div>

      <div className="relative">
        <span id={`${symbol}-chart-help`} className="sr-only">
          {labels.chartHelp}
        </span>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          role="slider"
          tabIndex={0}
          aria-label={`${symbol} ${labels.chart}`}
          aria-describedby={`${symbol}-chart-help`}
          aria-valuemin={0}
          aria-valuemax={lastIndex}
          aria-valuenow={displayedIndex}
          aria-valuetext={`${priceFormat.format(displayedPoint.close)}, ${dateFormat.format(new Date(displayedPoint.date))}`}
          className="block aspect-[1.6/1] w-full cursor-crosshair touch-pan-y overflow-visible outline-none select-none [-webkit-touch-callout:none] focus-visible:rounded-[12px] focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 sm:aspect-[2.4/1]"
          onPointerDown={startSelection}
          onPointerMove={moveSelection}
          onPointerUp={endSelection}
          onPointerCancel={endSelection}
          onPointerLeave={clearHover}
          onKeyDown={selectPointFromKeyboard}
          onContextMenu={preventLongPressMenu}
        >
          <defs>
            <linearGradient id={`stock-area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.24" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`stock-range-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rangeColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={rangeColor} stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            x2={chartWidth}
            y1={model.baselineY}
            y2={model.baselineY}
            stroke="var(--ios-tertiary-label)"
            strokeDasharray="2 6"
            strokeLinecap="round"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <g
            className="transition-opacity duration-200 motion-reduce:transition-none"
            opacity={range ? 0.3 : 1}
          >
            <path d={createAreaPath(0, lastIndex)} fill={`url(#stock-area-${symbol})`} />
            <path
              d={fullLinePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {range && selection && selection.second !== null ? (
            <>
              <path
                d={createAreaPath(selection.first, selection.second)}
                fill={`url(#stock-range-${symbol})`}
              />
              <path
                d={createLinePath(selection.first, selection.second)}
                fill="none"
                stroke={rangeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {[selection.first, selection.second].map(function renderRangeEdge(index) {
                const coordinate = model.coordinates[index];
                return coordinate ? (
                  <line
                    key={index}
                    x1={coordinate.x}
                    x2={coordinate.x}
                    y1="0"
                    y2={chartHeight}
                    stroke="var(--ios-label)"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null;
              })}
            </>
          ) : null}
          {scrubCoordinate ? (
            <line
              x1={scrubCoordinate.x}
              x2={scrubCoordinate.x}
              y1="0"
              y2={chartHeight}
              stroke="var(--ios-label)"
              strokeOpacity="0.45"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        {/* Dots stay round over the stretched chart, so they are drawn in HTML. */}
        {(range && selection && selection.second !== null
          ? [selection.first, selection.second]
          : scrubIndex !== null
            ? [scrubIndex]
            : [lastIndex]
        ).map(function renderDot(index) {
          const coordinate = model.coordinates[index];
          if (!coordinate) return null;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--ios-grouped-cell)",
                scrubIndex === null && !range && "animate-pulse motion-reduce:animate-none",
              )}
              style={{
                backgroundColor: range ? rangeColor : lineColor,
                left: `${(coordinate.x / chartWidth) * 100}%`,
                top: `${(coordinate.y / chartHeight) * 100}%`,
              }}
            />
          );
        })}
        <Text
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 rounded-[4px] bg-(--ios-grouped-cell) px-1 text-[11px] leading-[13px] text-(--ios-secondary-label) tabular-nums"
        >
          {priceFormat.format(model.maximum)}
        </Text>
        <Text
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 rounded-[4px] bg-(--ios-grouped-cell) px-1 text-[11px] leading-[13px] text-(--ios-secondary-label) tabular-nums"
        >
          {priceFormat.format(model.minimum)}
        </Text>
      </div>
    </div>
  );
}

function getDateFormat(timeframe: StockTimeframe): Intl.DateTimeFormatOptions {
  if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
    return { weekday: "short", hour: "numeric", minute: "2-digit" };
  }
  if (timeframe === "MAX" || timeframe === "5Y") return { month: "short", year: "numeric" };
  return { month: "short", day: "numeric", year: "numeric" };
}
