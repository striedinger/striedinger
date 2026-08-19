import { cacheLife } from "next/cache";
import { cache } from "react";
import "server-only";

import type { PreviewErrorCode } from "../../lib/og/types";

import { fetchPageHtml } from "../../lib/og/fetch-page-html";
import { parsePageMetadata } from "../../lib/og/parse-page-metadata";
import { PreviewError } from "../../lib/og/preview-error";
import { validatePublicUrl } from "../../lib/og/validate-public-url";

const maximumTitleLength = 200;
const targetCacheSeconds = 300;

export type CardSearchParams = Record<string, string | string[] | undefined>;

export type CardPreview =
  | { status: "idle" }
  | { status: "error"; targetUrl: string; error: PreviewErrorCode }
  | {
      status: "ready";
      targetUrl: string;
      title: string;
      description: string;
      image: string;
      previewImage: string;
      titleOverridden: boolean;
      imageOverridden: boolean;
      imageOverrideRejected: boolean;
    };

export function getCardParams(searchParams: CardSearchParams) {
  return {
    image: singleValue(searchParams.image)?.trim() ?? "",
    targetUrl: singleValue(searchParams.url)?.trim() ?? "",
    title: singleValue(searchParams.title)?.trim() ?? "",
  };
}

export const resolveCardPreview = cache(async function resolveCardPreview(
  targetUrl: string,
  titleValue: string,
  imageValue: string,
): Promise<CardPreview> {
  if (!targetUrl) {
    return { status: "idle" };
  }

  const imageOverride = imageValue ? sanitizeImageUrl(imageValue) : "";
  // Start validating the override while the target page is fetched; the helper
  // never rejects, so the promise is safe to await later.
  const renderImagePromise = imageOverride ? sanitizeRenderImage(imageOverride) : undefined;

  const target = await fetchTargetCard(targetUrl);

  if (target.status === "error") {
    return { status: "error", targetUrl, error: target.error };
  }

  const titleOverride = sanitizeTitle(titleValue);
  const finalImage = imageOverride || target.card.image;
  const previewImage = renderImagePromise
    ? await renderImagePromise
    : await sanitizeRenderImage(finalImage);

  return {
    status: "ready",
    targetUrl,
    title: titleOverride || target.card.title,
    description: target.card.description,
    image: finalImage,
    previewImage,
    titleOverridden: Boolean(titleOverride),
    imageOverridden: Boolean(imageOverride),
    imageOverrideRejected: Boolean(imageValue) && !imageOverride,
  };
});

interface TargetCard {
  description: string;
  image: string;
  title: string;
}

type TargetCardResult =
  | { status: "ok"; card: TargetCard }
  | { status: "error"; error: PreviewErrorCode };

async function fetchTargetCard(targetUrl: string): Promise<TargetCardResult> {
  "use cache";
  cacheLife({ revalidate: targetCacheSeconds });

  try {
    const { html, url } = await fetchPageHtml(targetUrl);
    const metadata = parsePageMetadata(html, url);

    return {
      status: "ok",
      card: {
        description: metadata.twitterDescription,
        image: metadata.twitterImage,
        title: metadata.twitterTitle,
      },
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof PreviewError ? error.code : "unreachable",
    };
  }
}

export function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeTitle(value: string) {
  return value.replace(/\s+/g, " ").slice(0, maximumTitleLength);
}

function sanitizeImageUrl(value: string) {
  try {
    const url = new URL(value);

    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) {
      return url.toString();
    }
  } catch {
    // Fall through to the rejected value below.
  }

  return "";
}

async function sanitizeRenderImage(value: string): Promise<string> {
  if (!value) {
    return "";
  }

  try {
    const validatedImage = await validatePublicUrl(value);
    return validatedImage.url.toString();
  } catch {
    return "";
  }
}
