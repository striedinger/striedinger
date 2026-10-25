"use client";

import { TrashIcon } from "@workspace/icons/trash-icon";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { StockChangeDisplay } from "./stock-quote-summary";
import type { StockIdentity, StockQuote, StocksLabels } from "./types";

import { IosContextMenu } from "../../../components/ios/ios-context-menu";
import { IosSwipeActions } from "../../../components/ios/ios-swipe-actions";
import { StockQuoteSummary } from "./stock-quote-summary";

interface StockWatchlistRowProps {
  changeDisplay: StockChangeDisplay;
  labels: StocksLabels;
  locale: string;
  onOpen: (stock: StockIdentity) => void;
  onRemove: (stock: StockIdentity) => void;
  onToggleChange: () => void;
  quotes: Promise<Record<string, StockQuote>>;
  selected: boolean;
  stock: StockIdentity;
}

/** A watchlist row: ticker and company, today's sparkline and price, swiped left to remove. */
export function StockWatchlistRow({
  changeDisplay,
  labels,
  locale,
  onOpen,
  onRemove,
  onToggleChange,
  quotes,
  selected,
  stock,
}: StockWatchlistRowProps) {
  const labelId = `stock-row-${stock.symbol}`;
  const summaryProps = { changeDisplay, labels, locale, onToggleChange, symbol: stock.symbol };
  const removeLabel = `${labels.remove} ${stock.symbol}`;
  function removeStock() {
    onRemove(stock);
  }

  return (
    <li className="relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator">
      <IosSwipeActions
        className="bg-ios-background"
        trailingActions={[
          {
            id: "remove",
            label: removeLabel,
            icon: <TrashIcon />,
            colorClassName: "bg-ios-red",
            onSelect: removeStock,
          },
        ]}
      >
        <IosContextMenu
          className="relative flex min-h-16 items-center gap-3 px-4 py-2.5"
          sections={[
            {
              id: "stock",
              actions: [
                {
                  id: "remove",
                  label: removeLabel,
                  icon: <TrashIcon />,
                  destructive: true,
                  onSelect: removeStock,
                },
              ],
            },
          ]}
        >
          {/* The whole row opens the stock; the change button sits above it. */}
          <button
            type="button"
            aria-labelledby={labelId}
            aria-current={selected || undefined}
            className="absolute inset-0 transition-colors duration-150 outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed aria-current:bg-ios-fill/60 motion-reduce:transition-none"
            onClick={function openStock() {
              onOpen(stock);
            }}
          />
          <span id={labelId} className="pointer-events-none relative flex min-w-0 flex-1 flex-col">
            <Text as="span" className="text-ios-body font-bold text-ios-label">
              {stock.symbol}
            </Text>
            <Text
              as="span"
              numberOfLines={1}
              className="text-ios-subheadline text-ios-secondary-label"
            >
              {stock.name}
            </Text>
          </span>
          <span className="pointer-events-none relative">
            <Suspense fallback={<StockQuoteSummary quotes={null} {...summaryProps} />}>
              <StockQuoteSummary quotes={quotes} {...summaryProps} />
            </Suspense>
          </span>
        </IosContextMenu>
      </IosSwipeActions>
    </li>
  );
}
