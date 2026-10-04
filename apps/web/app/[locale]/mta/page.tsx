import type { Metadata } from "next";

import { Suspense } from "react";

import type { MtaLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getMtaTranslator } from "../../../messages/mta/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { MtaDashboardLoader } from "./mta-dashboard-loader";
import { MtaDashboardSkeleton } from "./mta-dashboard-skeleton";
import { MtaScreen } from "./mta-screen";

interface MtaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getMtaTranslator(locale);
  const title = translate("NYC Subway Arrival Times");
  const description = translate(
    "Find nearby subway stops and see when your next train is arriving.",
  );
  return createPageMetadata({ title, description, locale, path: "/mta" });
}

export default async function MtaPage({ searchParams }: MtaPageProps) {
  const locale = await getRequestLocale();
  const translate = await getMtaTranslator(locale);
  const labels: MtaLabels = {
    title: translate("Trains near you"),
    cancel: translate("Cancel"),
    clearText: translate("Clear text"),
    description: translate("Find nearby subway stops and see when your next train is arriving."),
    locationLabel: translate("Where are you?"),
    locationPlaceholder: translate("Enter an address or neighborhood"),
    useLocation: translate("Use my location"),
    locating: translate("Finding your location"),
    search: translate("Search"),
    nearbyStops: translate("Nearby stops"),
    updated: translate("Updated"),
    refreshes: translate("refreshes every minute"),
    refresh: translate("Refresh arrivals"),
    direction: translate("Local service"),
    minutes: translate("min"),
    now: translate("Now"),
    walk: translate("walk"),
    locationError: translate(
      "We couldn't access your location. Search for a neighborhood instead.",
    ),
    searchHint: translate("Try Lower Manhattan, Tribeca, SoHo, East Village, or Chelsea."),
    searchError: translate(
      "We couldn't find that location. Try a full NYC address or neighborhood.",
    ),
    arrivalError: translate("Live MTA arrivals are temporarily unavailable. Please try again."),
    noArrivals: translate("No upcoming trains are currently reported for this stop."),
    filterByTrain: translate("Filter by train"),
    allTrains: translate("All trains"),
    previousTrains: translate("Previous trains"),
    nextTrains: translate("Next trains"),
    currentLocation: translate("Current location"),
    northbound: translate("Northbound"),
    southbound: translate("Southbound"),
    service: translate("Service"),
    attribution: translate(
      "Not affiliated with the Metropolitan Transportation Authority. Station and arrival data are provided by MTA GTFS feeds.",
    ),
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "TravelApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [labels.nearbyStops, labels.useLocation, labels.filterByTrain, labels.refreshes],
    locale,
    path: "/mta",
  });

  return (
    <MtaScreen title={labels.title}>
      <JsonLd value={structuredData} />
      <Suspense fallback={<MtaDashboardSkeleton />}>
        <MtaDashboardLoader searchParams={searchParams} labels={labels} locale={locale} />
      </Suspense>
    </MtaScreen>
  );
}
