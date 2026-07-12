"use server";

import { headers } from "next/headers";

import type { PreviewState } from "../../lib/og/types";

import { fetchPageHtml } from "../../lib/og/fetch-page-html";
import { parsePageMetadata } from "../../lib/og/parse-page-metadata";
import { PreviewError } from "../../lib/og/preview-error";
import { enforcePreviewRateLimit } from "../../lib/og/rate-limit";
import { sanitizePageMetadata } from "../../lib/og/sanitize-page-metadata";
import { normalizePreviewUrl } from "./normalize-preview-url";

export async function previewMetadata(
  previousState: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const submittedUrl = formData.get("url");
  const url = typeof submittedUrl === "string" ? submittedUrl.trim() : "";

  if (!url) {
    return { status: "error", url, error: "invalid-url" };
  }

  if (
    previousState.status === "success" &&
    normalizePreviewUrl(previousState.url) === normalizePreviewUrl(url)
  ) {
    return previousState;
  }

  const requestStartedAt = performance.now();

  try {
    const requestHeaders = await headers();
    const clientIdentifier =
      requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
      requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";
    await enforcePreviewRateLimit(clientIdentifier);
    const page = await fetchPageHtml(url);
    const parsedMetadata = parsePageMetadata(page.html, page.url);
    const metadata = await sanitizePageMetadata(parsedMetadata);
    return {
      status: "success",
      url,
      durationMilliseconds: Math.round(performance.now() - requestStartedAt),
      metadata,
    };
  } catch (error) {
    return {
      status: "error",
      url,
      error: error instanceof PreviewError ? error.code : "unreachable",
    };
  }
}
