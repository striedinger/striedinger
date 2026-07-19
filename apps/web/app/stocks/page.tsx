import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { StocksLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { getStocksTranslator } from "../../messages/stocks/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { StockDashboardLoader } from "./stock-dashboard-loader";
import { StockDashboardSkeleton } from "./stock-dashboard-skeleton";
import { getStockPageState } from "./stock-page-state";

interface StocksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getStocksTranslator(locale);
  const title = translate("Stock watchlist");
  const description = translate(
    "Search, save, and explore market trends across multiple timeframes.",
  );
  return {
    title,
    description,
    alternates: { canonical: "/stocks" },
    openGraph: {
      type: "website",
      url: "/stocks",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const [locale, resolvedSearchParams] = await Promise.all([getRequestLocale(), searchParams]);
  const initialState = getStockPageState(resolvedSearchParams);
  const translate = await getStocksTranslator(locale);
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
    rangeHelp: translate("Drag across the chart to select a range"),
    remove: translate("Remove"),
    resetZoom: translate("Reset zoom"),
    search: translate("Search stocks"),
    searchHelp: translate("Type a company name or symbol. Use arrow keys to browse results."),
    searchPlaceholder: translate("Search by company or ticker"),
    share: translate("Share chart"),
    title: translate("Stock watchlist"),
    volume: translate("Volume"),
    watchlist: translate("Watchlist"),
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: labels.title,
    description: labels.description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and local storage",
    url: "https://striedinger.co/stocks",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <PageHeader
          title={labels.title}
          description={labels.description}
          eyebrow={
            <span
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-5"
              >
                <path d="M3 17 9 11l4 4 8-9" />
                <path d="M15 6h6v6" />
              </svg>
            </span>
          }
        />
        <Suspense fallback={<StockDashboardSkeleton />}>
          <StockDashboardLoader
            initialSymbol={initialState.symbol}
            initialTimeframe={initialState.timeframe}
            labels={labels}
            locale={locale}
          />
        </Suspense>
        <footer className="border-t py-8">
          <Text size="xs" tone="muted">
            {labels.attribution}
          </Text>
        </footer>
      </PageContainer>
    </PageShell>
  );
}
