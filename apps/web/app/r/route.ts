import type { NextRequest } from "next/server";

import { after, NextResponse } from "next/server";

import type { VisitServerData } from "./log-visit";

import { getCardParams } from "../card/card-preview";
import { isCrawler, recordVisit } from "./log-visit";

export function GET(request: NextRequest) {
  const { targetUrl } = getCardParams(Object.fromEntries(request.nextUrl.searchParams));

  if (!targetUrl || !isHttpUrl(targetUrl)) {
    return NextResponse.redirect(new URL("/card", request.url));
  }

  const headerList = request.headers;
  const userAgent = (headerList.get("user-agent") ?? "").slice(0, 500);
  const visit: VisitServerData = {
    at: new Date().toISOString(),
    city: headerList.get("x-vercel-ip-city") ?? "",
    clientHints: {
      brands: headerList.get("sec-ch-ua") ?? "",
      mobile: headerList.get("sec-ch-ua-mobile") ?? "",
      platform: headerList.get("sec-ch-ua-platform") ?? "",
      platformVersion: headerList.get("sec-ch-ua-platform-version") ?? "",
    },
    country: headerList.get("x-vercel-ip-country") ?? "",
    doNotTrack: headerList.get("dnt") ?? "",
    fetchSite: headerList.get("sec-fetch-site") ?? "",
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    isCrawler: isCrawler(userAgent),
    language: (headerList.get("accept-language") ?? "").slice(0, 200),
    latitude: headerList.get("x-vercel-ip-latitude") ?? "",
    longitude: headerList.get("x-vercel-ip-longitude") ?? "",
    path: `/r?${request.nextUrl.searchParams.toString()}`.slice(0, 2048),
    postalCode: headerList.get("x-vercel-ip-postal-code") ?? "",
    purpose: headerList.get("sec-purpose") ?? headerList.get("purpose") ?? "",
    referrer: (headerList.get("referer") ?? "").slice(0, 1000),
    region: headerList.get("x-vercel-ip-country-region") ?? "",
    requestId: headerList.get("x-vercel-id") ?? "",
    targetUrl,
    timezone: headerList.get("x-vercel-ip-timezone") ?? "",
    userAgent,
  };

  after(async () => {
    await recordVisit(crypto.randomUUID(), visit);
  });

  // Card crawlers blindly follow redirects, so the platform builds the card
  // from the target's own metadata and displays the target's domain. Humans
  // get the same redirect once the visit is logged.
  return NextResponse.redirect(targetUrl, 302);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
