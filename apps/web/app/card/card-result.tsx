import { Text } from "@workspace/ui/components/text";

import type { PageMetadata, PreviewErrorCode } from "../../lib/og/types";
import type { CardPreview } from "./card-preview";

import { SocialCardPreview } from "../../components/social-card-preview";
import { resolveCardPreview } from "./card-preview";

interface CardResultProps {
  image: string;
  targetUrl: string;
  title: string;
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

export async function CardResult({ image, targetUrl, title }: CardResultProps) {
  const preview = await resolveCardPreview(targetUrl, title, image);

  if (preview.status === "idle") {
    return null;
  }

  if (preview.status === "error") {
    return <Text tone="destructive">{errorMessages[preview.error]}</Text>;
  }

  return (
    <section className="flex flex-col gap-6">
      <SocialCardPreview
        metadata={getCardMetadata(preview)}
        platform="twitter"
        title="What the preview will show"
      />
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
            Title{preview.titleOverridden ? " (custom)" : ""}
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
            Image{preview.imageOverridden ? " (custom)" : ""}
          </Text>
          <Text as="dd" family="mono" size="sm">
            {preview.image || "None found"}
          </Text>
        </div>
      </dl>
      {preview.imageOverrideRejected ? (
        <Text size="sm" tone="destructive">
          That image URL did not look right, so the website's own image is used.
        </Text>
      ) : null}
      <Text size="sm" tone="muted">
        Share the URL from your address bar. Apps remember a link's preview once they have seen it,
        so set everything up before sharing.
      </Text>
    </section>
  );
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
