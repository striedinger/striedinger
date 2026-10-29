"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { use } from "react";

import type {
  StockDetail,
  StockIdentity,
  StockSeries,
  StocksLabels,
  StockTimeframe,
} from "./types";

import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { getNumberFormat } from "../../../lib/intl-cache";
import { MarketSessionIndicator } from "./market-session-indicator";
import { StockChart } from "./stock-chart";
import { stockTimeframes } from "./types";

interface StockDetailContentProps {
  /** The open stock streaming from the server; `null` renders the loading state. */
  detail: Promise<StockDetail | null> | null;
  isNavigating: boolean;
  labels: StocksLabels;
  locale: string;
  onSelectTimeframe: (timeframe: StockTimeframe) => void;
  stock: StockIdentity;
  timeframe: StockTimeframe;
}

const timeframeLabels: Partial<Record<StockTimeframe, string>> = { MAX: "ALL" };

/** The open stock's price, change over the chosen timeframe, chart, and the day's figures. */
export function StockDetailContent({
  detail,
  isNavigating,
  labels,
  locale,
  onSelectTimeframe,
  stock,
  timeframe,
}: StockDetailContentProps) {
  const series = getDisplayedSeries(detail ? use(detail) : undefined, stock.symbol, isNavigating);
  const firstPoint = series?.points[0];
  const latestPoint = series?.points.at(-1);
  // The trading day is measured from the open, matching the watchlist; longer spans from the
  // first close.
  const baseline = firstPoint && (series.timeframe === "1D" ? firstPoint.open : firstPoint.close);
  // A zero baseline has no meaningful percent change, so it is treated like a missing one.
  const hasBaseline = baseline !== undefined && baseline !== 0;
  const change = latestPoint && hasBaseline ? latestPoint.close - baseline : 0;
  const isUp = change >= 0;
  const valueFormat = getNumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const changeFormat = getNumberFormat(locale, {
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const percentFormat = getNumberFormat(locale, {
    style: "percent",
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-4">
      {series && latestPoint && hasBaseline ? (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <Text className="text-ios-large-title font-bold text-ios-label tabular-nums">
              {valueFormat.format(latestPoint.close)}
            </Text>
            <Text as="span" className="text-ios-subheadline text-ios-secondary-label">
              {series.identity.currency}
            </Text>
          </div>
          <Text
            className={cn(
              "text-ios-body font-semibold tabular-nums",
              isUp ? "text-ios-green" : "text-ios-red",
            )}
          >
            {changeFormat.format(change)} ({percentFormat.format(change / baseline)})
          </Text>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <MarketSessionIndicator
              exchange={series.identity.exchange}
              labels={{
                afterHours: labels.afterHours,
                closed: labels.marketClosed,
                open: labels.marketOpen,
                preMarket: labels.preMarket,
              }}
            />
            {series.isDemo ? (
              <Text
                as="span"
                className="rounded-full bg-ios-fill px-2 py-0.5 text-ios-caption1 font-semibold text-ios-secondary-label"
              >
                {labels.demo}
              </Text>
            ) : null}
          </span>
        </div>
      ) : series === undefined ? (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <IosSkeleton className="h-10 w-40" />
          <IosSkeleton className="h-5 w-32" />
        </div>
      ) : null}

      <div role="group" aria-label={labels.chart} className="flex justify-between">
        {stockTimeframes.map(function renderTimeframe(option) {
          return (
            <button
              key={option}
              type="button"
              aria-pressed={option === timeframe}
              className="rounded-full px-2.5 py-1 text-ios-subheadline font-semibold text-ios-secondary-label transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 aria-pressed:bg-ios-fill aria-pressed:text-ios-label motion-reduce:transition-none"
              onClick={function selectTimeframe() {
                if (option !== timeframe) onSelectTimeframe(option);
              }}
            >
              {timeframeLabels[option] ?? option}
            </button>
          );
        })}
      </div>

      {series === undefined ? (
        <div role="status" aria-label={labels.loading} className="flex flex-col gap-2">
          <IosSkeleton className="h-11 w-48" />
          <IosSkeleton className="aspect-[1.6/1] w-full rounded-ios-lg sm:aspect-[2.4/1]" />
        </div>
      ) : series === null ? (
        <div
          role="alert"
          className="flex aspect-[1.6/1] items-center justify-center rounded-ios-lg bg-ios-grouped-cell p-6 text-center sm:aspect-[2.4/1]"
        >
          <Text className="text-ios-subheadline text-ios-secondary-label">
            {labels.dataUnavailable}
          </Text>
        </div>
      ) : (
        <div
          aria-busy={isNavigating && series.timeframe !== timeframe}
          className="relative transition-opacity duration-200 aria-busy:opacity-50 motion-reduce:transition-none"
        >
          <StockChart
            key={`${stock.symbol}-${series.timeframe}`}
            currency={series.identity.currency}
            labels={labels}
            locale={locale}
            points={series.points}
            symbol={stock.symbol}
            timeframe={series.timeframe}
          />
        </div>
      )}

      {latestPoint ? (
        <dl className="m-0 grid grid-cols-2 gap-x-6">
          {[
            [labels.open, valueFormat.format(latestPoint.open)],
            [labels.high, valueFormat.format(latestPoint.high)],
            [labels.low, valueFormat.format(latestPoint.low)],
            [
              labels.volume,
              getNumberFormat(locale, { notation: "compact" }).format(latestPoint.volume),
            ],
          ].map(function renderStat([label, value]) {
            return (
              <div
                key={label}
                className="flex items-baseline justify-between gap-2 border-b-[0.5px] border-ios-separator py-2"
              >
                <Text as="dt" className="text-ios-subheadline text-ios-secondary-label">
                  {label}
                </Text>
                <Text
                  as="dd"
                  className="m-0 text-ios-subheadline font-semibold text-ios-label tabular-nums"
                >
                  {value}
                </Text>
              </div>
            );
          })}
        </dl>
      ) : null}
      <Text className="text-ios-caption1 text-ios-secondary-label">{labels.attribution}</Text>
    </div>
  );
}

/**
 * The series to show: `undefined` while it loads, including while a newly opened stock's data
 * is on its way, and `null` once the server could not provide it.
 */
function getDisplayedSeries(
  detail: StockDetail | null | undefined,
  symbol: string,
  isNavigating: boolean,
): StockSeries | null | undefined {
  if (detail === undefined) return undefined;
  if (detail?.stock.symbol === symbol) return detail.series;
  return isNavigating ? undefined : null;
}
