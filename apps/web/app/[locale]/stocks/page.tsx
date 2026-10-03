import type { Metadata } from "next";

import { Suspense } from "react";

import type { StocksLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getStocksTranslator } from "../../../messages/stocks/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { StockDashboardLoader } from "./stock-dashboard-loader";
import { StockDashboardSkeleton } from "./stock-dashboard-skeleton";
import { getStockPageState } from "./stock-page-state";
import { StocksScreen } from "./stocks-screen";

interface StocksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getStocksTranslator(locale);
  const title = translate("Stock Charts and Watchlist");
  const description = translate(
    "Search, save, and explore market trends across multiple timeframes.",
  );
  return createPageMetadata({ title, description, locale, path: "/stocks" });
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const [locale, resolvedSearchParams] = await Promise.all([getRequestLocale(), searchParams]);
  const initialState = getStockPageState(resolvedSearchParams);
  const translate = await getStocksTranslator(locale);
  const localStorageDescription = translate(
    "Your watchlist is stored only in this browser and works without creating an account.",
  );
  const labels: StocksLabels = {
    add: translate("Add"),
    added: translate("Added"),
    afterHours: translate("After hours"),
    attribution: translate(
      "Market data provided by Twelve Data. Quotes may be delayed and are for informational purposes only.",
    ),
    chart: translate("Chart"),
    chartHelp: translate(
      "Drag across the chart or use the left and right arrow keys to inspect prices.",
    ),
    close: translate("Close"),
    copied: translate("Link copied"),
    dataUnavailable: translate(
      "Market data is temporarily unavailable. Try another timeframe or stock.",
    ),
    demo: translate("Demo data"),
    description: translate("Search, save, and explore market trends across multiple timeframes."),
    emptyWatchlist: translate("Your watchlist is empty. Search for a stock to begin."),
    high: translate("High"),
    loading: translate("Loading market data"),
    low: translate("Low"),
    marketClosed: translate("Market closed"),
    marketOpen: translate("Market open"),
    open: translate("Open"),
    price: translate("Price"),
    preMarket: translate("Pre-market"),
    remove: translate("Remove"),
    search: translate("Search stocks"),
    searchHelp: translate("Type a company name or symbol. Use arrow keys to browse results."),
    searchPlaceholder: translate("Search by company or ticker"),
    share: translate("Share chart"),
    title: translate("Stock watchlist"),
    volume: translate("Volume"),
    watchlist: translate("Watchlist"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "FinanceApplication",
    browserRequirements: "Requires JavaScript and local storage",
    featureList: [labels.search, labels.watchlist, labels.chart, localStorageDescription],
    locale,
    path: "/stocks",
  });

  return (
    <StocksScreen title={labels.title}>
      <JsonLd value={structuredData} />
      <Suspense fallback={<StockDashboardSkeleton />}>
        <StockDashboardLoader
          initialSymbol={initialState.symbol}
          initialTimeframe={initialState.timeframe}
          query={initialState.query}
          labels={labels}
          locale={locale}
        />
      </Suspense>
    </StocksScreen>
  );
}
