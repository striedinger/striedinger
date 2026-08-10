import type { NextRequest } from "next/server";

import { localeCookieName } from "@workspace/i18n";
import { NextResponse } from "next/server";

import { getPathLocale, routeLocaleHeaderName, stripLocaleFromPath } from "./lib/locale-path";

const instagramWebViewUserAgentPattern = /\bInstagram\b/;
const aiCrawlerUserAgentPattern =
  /\b(?:OAI-SearchBot|ChatGPT-User|GPTBot|PerplexityBot|Perplexity-User|ClaudeBot|Claude-User|Claude-SearchBot|Google-Extended|Applebot-Extended|Amazonbot|Bytespider|cohere-ai|meta-externalagent)\b/i;
const canonicalHostname = "striedinger.co";

export function proxy(request: NextRequest) {
  const requestHostname = request.headers.get("host")?.split(":")[0];

  if (
    request.nextUrl.hostname === `www.${canonicalHostname}` ||
    requestHostname === `www.${canonicalHostname}`
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = canonicalHostname;

    return NextResponse.redirect(canonicalUrl, 308);
  }

  const userAgent = request.headers.get("user-agent") ?? "";

  if (!instagramWebViewUserAgentPattern.test(userAgent)) {
    const routeLocale = getPathLocale(request.nextUrl.pathname);
    const isAiCrawler = aiCrawlerUserAgentPattern.test(userAgent);

    if (!routeLocale && !isAiCrawler) {
      return NextResponse.next();
    }

    if (routeLocale === "en") {
      const destinationUrl = request.nextUrl.clone();
      destinationUrl.pathname = stripLocaleFromPath(request.nextUrl.pathname);

      return NextResponse.redirect(destinationUrl, 308);
    }

    const requestHeaders = new Headers(request.headers);

    if (routeLocale) {
      requestHeaders.set(routeLocaleHeaderName, routeLocale);
    }

    if (isAiCrawler) {
      requestHeaders.set("x-original-user-agent", userAgent);
      requestHeaders.set("user-agent", "Bingbot/2.0");
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    if (routeLocale) {
      response.cookies.set(localeCookieName, routeLocale, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
    }

    return response;
  }

  const targetUrl = encodeURIComponent(request.nextUrl.href);

  return NextResponse.redirect(`instagram://extbrowser/?url=${targetUrl}`, 307);
}
