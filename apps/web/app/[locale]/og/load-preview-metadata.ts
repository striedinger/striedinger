import "server-only";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";

import type { PageMetadata, PreviewErrorCode, PreviewState } from "../../../lib/og/types";

import { fetchPageHtml } from "../../../lib/og/fetch-page-html";
import { parsePageMetadata } from "../../../lib/og/parse-page-metadata";
import { PreviewError } from "../../../lib/og/preview-error";
import { enforcePreviewRateLimit } from "../../../lib/og/rate-limit";
import { sanitizePageMetadata } from "../../../lib/og/sanitize-page-metadata";

type FetchedPreview =
  | { status: "success"; metadata: PageMetadata }
  | { status: "error"; error: PreviewErrorCode };

export async function loadPreviewMetadata(url: string): Promise<PreviewState> {
  const requestStartedAt = performance.now();

  try {
    const requestHeaders = await headers();
    const clientIdentifier =
      requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
      requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";
    await enforcePreviewRateLimit(clientIdentifier);
  } catch (error) {
    return {
      status: "error",
      url,
      error: error instanceof PreviewError ? error.code : "unreachable",
    };
  }

  const preview = await fetchPreview(url);
  return preview.status === "success"
    ? {
        status: "success",
        url,
        durationMilliseconds: Math.round(performance.now() - requestStartedAt),
        metadata: preview.metadata,
      }
    : { status: "error", url, error: preview.error };
}

/**
 * Fetches, parses, and sanitizes a page's metadata, cached per URL so a link shared around
 * is fetched once for everyone. The rate limit still applies to each request beforehand.
 */
async function fetchPreview(url: string): Promise<FetchedPreview> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3_600 });

  try {
    const page = await fetchPageHtml(url);
    const metadata = await sanitizePageMetadata(parsePageMetadata(page.html, page.url));
    return { status: "success", metadata };
  } catch (error) {
    // A failed fetch may be temporary, so keep it only briefly.
    cacheLife({ stale: 10, revalidate: 30, expire: 60 });
    return { status: "error", error: error instanceof PreviewError ? error.code : "unreachable" };
  }
}
