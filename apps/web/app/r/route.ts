import type { NextRequest } from "next/server";

import { after, NextResponse } from "next/server";

import type { VisitServerData } from "./log-visit";

import { getClientIdentifierFromHeaders } from "../../lib/client-identifier";
import { isRateLimited } from "../../lib/rate-limit";
import { getCardParams } from "../[locale]/card/card-preview";
import { canonicalizeCardTarget, isValidCardLinkSignature } from "./card-link-signature";
import { createLinkConfirmationResponse } from "./create-link-confirmation-response";
import { isCrawler, recordVisit } from "./log-visit";

const maximumLoggedVisitsPerWindow = 30;
const visitLogWindowMilliseconds = 60_000;

export async function GET(request: NextRequest) {
  const { targetUrl: requestedTargetUrl } = getCardParams(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const targetUrl = canonicalizeCardTarget(requestedTargetUrl);

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/card", request.url));
  }

  const signature = request.nextUrl.searchParams.get("sig");

  if (!signature || !(await isValidCardLinkSignature(targetUrl, signature))) {
    return createLinkConfirmationResponse(targetUrl);
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

  const clientIdentifier = getClientIdentifierFromHeaders(headerList);

  after(async () => {
    // Anyone can hit this route, so each client gets a bounded number of stored visits.
    const isLoggingLimited = await isRateLimited({
      identifier: clientIdentifier,
      maximumRequests: maximumLoggedVisitsPerWindow,
      scope: "card-visit",
      windowMilliseconds: visitLogWindowMilliseconds,
    });
    if (!isLoggingLimited) await recordVisit(crypto.randomUUID(), visit);
  });

  // Card crawlers blindly follow redirects, so the platform builds the card
  // from the target's own metadata and displays the target's domain. Humans
  // get the same redirect.
  return NextResponse.redirect(targetUrl, 302);
}
