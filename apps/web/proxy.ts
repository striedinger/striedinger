import type { NextRequest } from "next/server";

import { isLocale, localeCookieName, resolveLocale, type Locale } from "@workspace/i18n";
import { NextResponse } from "next/server";

import { getPathLocale, stripLocaleFromPath } from "./lib/locale-path";

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

  if (instagramWebViewUserAgentPattern.test(userAgent)) {
    const targetUrl = encodeURIComponent(request.nextUrl.href);
    return NextResponse.redirect(`instagram://extbrowser/?url=${targetUrl}`, 307);
  }

  const { pathname } = request.nextUrl;
  const routeLocale = getPathLocale(pathname);

  if (routeLocale === "en") {
    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = stripLocaleFromPath(pathname);
    return NextResponse.redirect(destinationUrl, 308);
  }

  const requestOverrides = getAiCrawlerRequestOverrides(request, userAgent);

  if (routeLocale) {
    const response = NextResponse.next(requestOverrides);
    response.cookies.set(localeCookieName, routeLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  if (!isLocalizedRoute(pathname)) {
    return NextResponse.next(requestOverrides);
  }

  // Unprefixed URLs render the visitor's language from the statically generated [locale] tree,
  // so URLs never need a locale code.
  const destinationUrl = request.nextUrl.clone();
  destinationUrl.pathname = `/${negotiateLocale(request)}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.rewrite(destinationUrl, requestOverrides);
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

/**
 * AI crawlers get the same fully rendered HTML as search engines. Other requests pass through
 * untouched, so most visitors skip copying the request headers.
 */
function getAiCrawlerRequestOverrides(request: NextRequest, userAgent: string) {
  if (!aiCrawlerUserAgentPattern.test(userAgent)) return undefined;
  const headers = new Headers(request.headers);
  headers.set("x-original-user-agent", userAgent);
  headers.set("user-agent", "Bingbot/2.0");
  return { request: { headers } };
}

/** Pages and their Open Graph images live under [locale]; files and the redirect logger do not. */
function isLocalizedRoute(pathname: string) {
  if (pathname === "/r" || pathname.startsWith("/r/")) return false;
  const lastSegment = pathname.split("/").at(-1) ?? "";
  return !lastSegment.includes(".");
}

function negotiateLocale(request: NextRequest): Locale {
  // Social cards for unprefixed URLs are shared and cached, so they are always English.
  if (/\/(?:opengraph|twitter)-image$/.test(request.nextUrl.pathname)) return "en";
  const savedLocale = request.cookies.get(localeCookieName)?.value;
  if (savedLocale && isLocale(savedLocale)) return savedLocale;
  const acceptedLanguages =
    request.headers
      .get("accept-language")
      ?.split(",")
      .map(function removeLanguageWeight(languageRange) {
        return languageRange.trim().split(";")[0] ?? "";
      })
      .filter(Boolean) ?? [];
  return resolveLocale(acceptedLanguages);
}

// Static assets, framework chunks, and vendored runtimes never need locale or host handling.
export const config = {
  matcher: [
    "/((?!_next/|vendor/|.*\\.(?:avif|css|gif|ico|jpe?g|js|map|png|svg|wasm|webp|woff2?)$).*)",
  ],
};
