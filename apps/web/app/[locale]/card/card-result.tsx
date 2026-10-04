import { Text } from "@workspace/ui/components/text";
import { headers } from "next/headers";

import type { PageMetadata, PreviewErrorCode } from "../../../lib/og/types";
import type { CardPreview } from "./card-preview";

import { IosCopyRowButton } from "../../../components/ios/ios-copy-row-button";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosValueRow } from "../../../components/ios/ios-value-row";
import { SocialCardPreview } from "../../../components/social-card-preview";
import { resolveCardPreview } from "./card-preview";

interface CardResultProps {
  targetUrl: string;
}

// The shared social card keeps the platform's look; its heading takes the grouped-section
// header style so it lines up with the sections below.
const socialCardClassName =
  "flex flex-col [&_h2]:px-5 [&_h2]:text-[15px] [&_h2]:leading-5 [&_h2]:font-semibold [&_h2]:tracking-[-0.23px] [&_h2]:text-ios-secondary-label [&>section]:gap-1.5";

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
    return (
      <Text role="alert" className="text-ios-subheadline text-ios-red px-5">
        {errorMessages[preview.error]}
      </Text>
    );
  }

  const trackedUrl = await getTrackedUrl(preview);

  return (
    <div className="flex flex-col gap-6">
      <div className={socialCardClassName}>
        <SocialCardPreview metadata={getCardMetadata(preview)} platform="twitter" title="Preview" />
      </div>
      <IosListSection header="Share this link" className="px-0">
        <li className="after:bg-ios-separator relative px-4 py-[11px] after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50">
          <Text
            family="mono"
            className="text-ios-label text-[15px] leading-[22px] [overflow-wrap:anywhere]"
          >
            {trackedUrl}
          </Text>
        </li>
        <li>
          <IosCopyRowButton value={trackedUrl} label="Copy link" copiedLabel="Copied" />
        </li>
      </IosListSection>
      <IosListSection header="Details" className="px-0">
        <IosValueRow label="Link" value={preview.targetUrl} monospaceValue />
        <IosValueRow label="Title" value={preview.title} />
        {preview.description ? (
          <IosValueRow label="Description" value={preview.description} />
        ) : null}
        <IosValueRow label="Image" value={preview.image || "None found"} monospaceValue />
      </IosListSection>
    </div>
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
