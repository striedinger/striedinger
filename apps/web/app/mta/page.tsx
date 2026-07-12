import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { InitialMtaState, MtaLabels } from "./types";

import { getMtaTranslator } from "../../messages/mta/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { MtaDashboardLoader } from "./mta-dashboard-loader";
import { MtaDashboardSkeleton } from "./mta-dashboard-skeleton";
import { defaultLocation } from "./mta-data";

interface MtaPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getMtaTranslator(locale);
  const title = translate("Trains near you");
  const description = translate(
    "Find nearby subway stops and see when your next train is arriving.",
  );
  return {
    title,
    description,
    alternates: { canonical: "/mta" },
    openGraph: {
      type: "website",
      url: "/mta",
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

export default async function MtaPage({ searchParams }: MtaPageProps) {
  const [locale, resolvedSearchParams] = await Promise.all([getRequestLocale(), searchParams]);
  const initialState = getInitialState(resolvedSearchParams);
  const translate = await getMtaTranslator(locale);
  const labels: MtaLabels = {
    title: translate("Trains near you"),
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

  return (
    <PageShell>
      <PageContainer>
        <PageHeader
          title={labels.title}
          description={labels.description}
          eyebrow={
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <Text
                  as="span"
                  size="2xl"
                  weight="bold"
                  family="sans"
                  className="leading-none text-primary-foreground"
                >
                  H
                </Text>
              </span>
              <Text as="span" size="xs" weight="bold" className="tracking-[0.2em]">
                NYC SUBWAY
              </Text>
            </div>
          }
        />
        <Suspense fallback={<MtaDashboardSkeleton />}>
          <MtaDashboardLoader initialState={initialState} labels={labels} locale={locale} />
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

function getInitialState(
  searchParams: Record<string, string | string[] | undefined>,
): InitialMtaState {
  const latitude = Number(singleValue(searchParams.latitude));
  const longitude = Number(singleValue(searchParams.longitude));
  const hasValidCoordinates =
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;
  const locationName =
    singleValue(searchParams.location)?.trim().slice(0, 160) || "Lower Manhattan";
  const requestedRoute = singleValue(searchParams.train)?.trim().toUpperCase();
  return {
    coordinates: hasValidCoordinates ? { latitude, longitude } : defaultLocation,
    locationName,
    selectedRoute:
      requestedRoute && /^[1-7ACEBDFMGJZLNQRWS]$/.test(requestedRoute) ? requestedRoute : null,
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
