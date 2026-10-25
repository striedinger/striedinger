"use client";

import { Suspense } from "react";

import type { StockDetail, StockIdentity, StocksLabels, StockTimeframe } from "./types";

import { IosSheet } from "../../../components/ios/ios-sheet";
import { StockDetailActions } from "./stock-detail-actions";
import { StockDetailContent } from "./stock-detail-content";
import { StockDetailName } from "./stock-detail-name";

interface StockDetailSheetProps {
  detail: Promise<StockDetail | null>;
  isInWatchlist: boolean;
  isNavigating: boolean;
  labels: StocksLabels;
  locale: string;
  onAdd: (stock: StockIdentity) => void;
  onClosed: () => void;
  onOpenChange: (open: boolean) => void;
  onSelectTimeframe: (timeframe: StockTimeframe) => void;
  open: boolean;
  stock: StockIdentity;
  timeframe: StockTimeframe;
}

/**
 * The sheet a stock opens in, as in iOS Stocks: its ticker and company over the price, a
 * timeframe picker, the chart, and the day's figures, with buttons to add it and share it.
 */
export function StockDetailSheet({
  detail,
  isInWatchlist,
  isNavigating,
  labels,
  locale,
  onAdd,
  onClosed,
  onOpenChange,
  onSelectTimeframe,
  open,
  stock,
  timeframe,
}: StockDetailSheetProps) {
  const actionsProps = { isInWatchlist, labels, onAdd, stock, timeframe };
  const contentProps = { isNavigating, labels, locale, onSelectTimeframe, stock, timeframe };

  return (
    <IosSheet
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={function reportClosed(isOpen) {
        if (!isOpen) onClosed();
      }}
      closeLabel={labels.close}
      detent="large"
      titleAlignment="leading"
      title={stock.symbol}
      subtitle={
        <Suspense fallback={stock.name}>
          <StockDetailName detail={detail} stock={stock} />
        </Suspense>
      }
      trailing={
        <Suspense fallback={<StockDetailActions detail={null} {...actionsProps} />}>
          <StockDetailActions detail={detail} {...actionsProps} />
        </Suspense>
      }
      contentClassName="px-5 pt-2 pb-6"
    >
      <Suspense fallback={<StockDetailContent detail={null} {...contentProps} />}>
        <StockDetailContent detail={detail} {...contentProps} />
      </Suspense>
    </IosSheet>
  );
}
