"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { use } from "react";

import type { StockQuote, StocksLabels } from "./types";

import { getNumberFormat } from "../../../lib/intl-cache";
import { StockSparkline } from "./stock-sparkline";

export type StockChangeDisplay = "percent" | "price";

interface StockQuoteSummaryProps {
  changeDisplay: StockChangeDisplay;
  labels: StocksLabels;
  locale: string;
  onToggleChange: () => void;
  /** Quotes streaming from the server; `null` renders the loading placeholder. */
  quotes: Promise<Record<string, StockQuote>> | null;
  symbol: string;
}

/**
 * A watchlist row's sparkline, price, and the colored change button, which switches every
 * row between the percentage and the price change, as tapping it does in iOS Stocks.
 */
export function StockQuoteSummary({
  changeDisplay,
  labels,
  locale,
  onToggleChange,
  quotes,
  symbol,
}: StockQuoteSummaryProps) {
  const quote = quotes ? (use(quotes)[symbol] ?? null) : undefined;
  if (quote === undefined) {
    return (
      <span aria-hidden="true" className="flex shrink-0 items-center gap-3">
        <span className="h-7.5 w-16" />
        <span className="flex flex-col items-end gap-1">
          <span className="h-4.5 w-14 rounded-ios-xs bg-ios-fill" />
          <span className="h-7 w-18 rounded-ios-sm bg-ios-fill" />
        </span>
      </span>
    );
  }

  const isUp = (quote?.change ?? 0) >= 0;
  const valueFormat = getNumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const changeText = quote
    ? changeDisplay === "percent"
      ? getNumberFormat(locale, {
          style: "percent",
          signDisplay: "exceptZero",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(quote.changePercent / 100)
      : getNumberFormat(locale, {
          signDisplay: "exceptZero",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(quote.change)
    : "—";

  return (
    <span className="flex shrink-0 items-center gap-3">
      {quote ? (
        <StockSparkline
          baseline={quote.price - quote.change}
          isUp={isUp}
          values={quote.sparkline}
        />
      ) : null}
      <span className="flex flex-col items-end gap-1">
        <Text as="span" className="text-ios-body font-semibold text-ios-label tabular-nums">
          {quote ? valueFormat.format(quote.price) : "—"}
        </Text>
        <button
          type="button"
          aria-label={`${changeText}. ${labels.toggleChange}`}
          disabled={!quote}
          className={cn(
            "pointer-events-auto relative min-w-18 rounded-ios-sm px-1.5 py-0.5 text-right text-ios-subheadline font-semibold text-white tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-70",
            !quote ? "bg-ios-fill text-ios-secondary-label" : isUp ? "bg-ios-green" : "bg-ios-red",
          )}
          onClick={onToggleChange}
        >
          {changeText}
        </button>
      </span>
    </span>
  );
}
