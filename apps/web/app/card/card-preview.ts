import type { Metadata } from "next";

import { cacheLife } from "next/cache";
import { cache } from "react";
import "server-only";

import type { PreviewErrorCode } from "../../lib/og/types";

import { fetchPageHtml } from "../../lib/og/fetch-page-html";
import { parsePageMetadata } from "../../lib/og/parse-page-metadata";
import { PreviewError } from "../../lib/og/preview-error";
import { validatePublicUrl } from "../../lib/og/validate-public-url";

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
    };

export function getCardParams(searchParams: CardSearchParams) {
  return { targetUrl: singleValue(searchParams.url)?.trim() ?? "" };
}

export const resolveCardPreview = cache(async function resolveCardPreview(
  targetUrl: string,
): Promise<CardPreview> {
  if (!targetUrl) {
    return { status: "idle" };
  }

  const target = await fetchTargetCard(targetUrl);

  if (target.status === "error") {
    return { status: "error", targetUrl, error: target.error };
  }

  return {
    status: "ready",
    targetUrl,
    title: target.card.title,
    description: target.card.description,
    image: target.card.image,
    previewImage: await sanitizeRenderImage(target.card.image),
  };
});

export function createCardMetadata(preview: CardPreview): Metadata {
  if (preview.status !== "ready") {
    return {
      title: "Link Card Maker",
      robots: { follow: false, index: false },
    };
  }

  return {
    title: preview.title,
    description: preview.description || undefined,
    robots: { follow: false, index: false },
    openGraph: {
      title: preview.title,
      description: preview.description || undefined,
      url: preview.targetUrl,
      images: preview.image ? [preview.image] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: preview.title,
      description: preview.description || undefined,
      images: preview.image ? [preview.image] : undefined,
    },
  };
}

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

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
