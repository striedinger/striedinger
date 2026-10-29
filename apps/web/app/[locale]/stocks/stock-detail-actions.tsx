"use client";

import { PlusIcon } from "@workspace/icons/plus-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { use, useState } from "react";

import type { StockDetail, StockIdentity, StocksLabels, StockTimeframe } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { playStockHaptic } from "./haptics";
import { resolveDetailStock } from "./resolve-detail-stock";

interface StockDetailActionsProps {
  detail: Promise<StockDetail | null> | null;
  isInWatchlist: boolean;
  labels: StocksLabels;
  onAdd: (stock: StockIdentity) => void;
  stock: StockIdentity;
  timeframe: StockTimeframe;
}

/** The sheet's add button, shown for stocks not yet in the watchlist, and its share button. */
export function StockDetailActions({
  detail,
  isInWatchlist,
  labels,
  onAdd,
  stock,
  timeframe,
}: StockDetailActionsProps) {
  const resolvedStock = resolveDetailStock(detail ? use(detail) : undefined, stock);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  async function shareStock() {
    // A shared chart opens the stock; the sharer's watchlist stays theirs.
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("symbol", resolvedStock.symbol);
    url.searchParams.set("timeframe", timeframe);
    const shareData = { title: `${resolvedStock.symbol} · ${labels.title}`, url: url.toString() };
    if ("share" in navigator) {
      try {
        await navigator.share(shareData);
        playStockHaptic("success");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopiedSymbol(resolvedStock.symbol);
      playStockHaptic("success");
    } catch {
      // Clipboard access can be denied; there is no further fallback.
    }
  }

  return (
    <>
      {isInWatchlist ? null : (
        <IosBarButton
          aria-label={labels.addToWatchlist}
          className="text-ios-tint"
          onClick={function addStock() {
            onAdd(resolvedStock);
          }}
        >
          <PlusIcon strokeWidth={2.4} />
        </IosBarButton>
      )}
      <IosBarButton
        aria-label={labels.share}
        className="text-ios-tint"
        onClick={function shareStockFromButton() {
          // shareStock handles its own failures.
          void shareStock();
        }}
      >
        <ShareUpIcon />
      </IosBarButton>
      <span className="sr-only" aria-live="polite">
        {copiedSymbol === resolvedStock.symbol ? labels.copied : ""}
      </span>
    </>
  );
}
