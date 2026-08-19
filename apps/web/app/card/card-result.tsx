import { Text } from "@workspace/ui/components/text";
import { headers } from "next/headers";

import type { PageMetadata, PreviewErrorCode } from "../../lib/og/types";
import type { CardPreview } from "./card-preview";

import { SocialCardPreview } from "../../components/social-card-preview";
import { resolveCardPreview } from "./card-preview";
import { CopyLinkButton } from "./copy-link-button";

interface CardResultProps {
  targetUrl: string;
}

const errorMessages: Readonly<Record<PreviewErrorCode, string>> = {
  "invalid-url": "Enter a full URL starting with http:// or https://.",
  "unsafe-url": "That address is not allowed.",
  unreachable: "That page could not be reached.",
  "not-html": "That link does not point to a web page.",
  "too-large": "That page is too large to read.",
  "missing-metadata": "No title or image was found on that page.",
  "rate-limited": "Too many tries. Wait a minute and try again.",
};

export async function CardResult({ targetUrl }: CardResultProps) {
  const preview = await resolveCardPreview(targetUrl);

  if (preview.status === "idle") {
    return null;
  }

  if (preview.status === "error") {
    return <Text tone="destructive">{errorMessages[preview.error]}</Text>;
  }

  const trackedUrl = await getTrackedUrl(preview);

  return (
    <section className="flex flex-col gap-6">
      <SocialCardPreview metadata={getCardMetadata(preview)} platform="twitter" title="Preview" />
      <div className="flex flex-col gap-2">
        <Text size="sm" weight="medium" tone="muted">
          Share this link
        </Text>
        <div className="flex flex-wrap items-center gap-3">
          <Text family="mono" size="sm" className="break-all">
            {trackedUrl}
          </Text>
          <CopyLinkButton url={trackedUrl} />
        </div>
      </div>
      <dl className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Text as="dt" size="sm" weight="medium" tone="muted">
            Link
          </Text>
          <Text as="dd" family="mono" size="sm">
            {preview.targetUrl}
          </Text>
        </div>
        <div className="flex flex-col gap-1">
          <Text as="dt" size="sm" weight="medium" tone="muted">
            Title
          </Text>
          <Text as="dd" size="sm">
            {preview.title}
          </Text>
        </div>
        {preview.description ? (
          <div className="flex flex-col gap-1">
            <Text as="dt" size="sm" weight="medium" tone="muted">
              Description
            </Text>
            <Text as="dd" size="sm">
              {preview.description}
            </Text>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <Text as="dt" size="sm" weight="medium" tone="muted">
            Image
          </Text>
          <Text as="dd" family="mono" size="sm">
            {preview.image || "None found"}
          </Text>
        </div>
      </dl>
      <Text size="sm" tone="muted">
        Anyone who opens it goes straight to that site. Apps remember a preview once they have seen
        it, so set everything up first.
      </Text>
    </section>
  );
}

async function getTrackedUrl(preview: Extract<CardPreview, { status: "ready" }>) {
  const query = new URLSearchParams({ url: preview.targetUrl });
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const path = `/r?${query.toString()}`;

  return host ? `https://${host}${path}` : path;
}

function getCardMetadata(preview: Extract<CardPreview, { status: "ready" }>): PageMetadata {
  return {
    canonicalUrl: preview.targetUrl,
    description: preview.description,
    image: preview.previewImage,
    siteName: new URL(preview.targetUrl).hostname,
    title: preview.title,
    twitterCard: "summary_large_image",
    twitterDescription: preview.description,
    twitterImage: preview.previewImage,
    twitterTitle: preview.title,
    tags: [],
  };
}
