import type { Metadata } from "next";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import type { CardSearchParams } from "../card/card-preview";
import type { VisitServerData } from "./log-visit";

import { createCardMetadata, getCardParams, resolveCardPreview } from "../card/card-preview";
import { isCrawler, recordVisit } from "./log-visit";
import { RedirectTracker } from "./redirect-tracker";

interface TrackerPageProps {
  searchParams: Promise<CardSearchParams>;
}

export async function generateMetadata({ searchParams }: TrackerPageProps): Promise<Metadata> {
  const { image, targetUrl, title } = getCardParams(await searchParams);
  const preview = await resolveCardPreview(targetUrl, title, image);
  return createCardMetadata(preview);
}

export default async function TrackerPage({ searchParams }: TrackerPageProps) {
  const resolvedSearchParams = await searchParams;
  const { targetUrl } = getCardParams(resolvedSearchParams);

  // The interstitial redirects with window.location, which would execute a
  // javascript: URL — only ever redirect to absolute http(s) targets.
  if (!targetUrl || !isHttpUrl(targetUrl)) {
    redirect("/card");
  }

  const headerList = await headers();
  const userAgent = (headerList.get("user-agent") ?? "").slice(0, 500);
  const visitId = crypto.randomUUID();
  const visit: VisitServerData = {
    at: new Date().toISOString(),
    city: headerList.get("x-vercel-ip-city") ?? "",
    clientHints: {
      mobile: headerList.get("sec-ch-ua-mobile") ?? "",
      platform: headerList.get("sec-ch-ua-platform") ?? "",
      platformVersion: headerList.get("sec-ch-ua-platform-version") ?? "",
    },
    country: headerList.get("x-vercel-ip-country") ?? "",
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    isCrawler: isCrawler(userAgent),
    language: (headerList.get("accept-language") ?? "").slice(0, 200),
    path: `/r?${toQueryString(resolvedSearchParams)}`.slice(0, 2048),
    referrer: (headerList.get("referer") ?? "").slice(0, 1000),
    region: headerList.get("x-vercel-ip-country-region") ?? "",
    targetUrl,
    userAgent,
  };

  after(async () => {
    await recordVisit(visitId, visit);
  });

  if (visit.isCrawler) {
    // Crawlers only read the metadata above; never redirect them.
    return null;
  }

  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${targetUrl}`} />
      </noscript>
      <RedirectTracker targetUrl={targetUrl} visitId={visitId} />
    </>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toQueryString(searchParams: CardSearchParams): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const text = Array.isArray(value) ? value[0] : value;

    if (text) {
      query.set(key, text);
    }
  }

  return query.toString();
}
