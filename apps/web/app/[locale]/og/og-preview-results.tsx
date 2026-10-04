import { Text } from "@workspace/ui/components/text";

import type { OgPreviewLabels } from "../../../lib/og/labels";
import type { PreviewState } from "../../../lib/og/types";

import { SocialCardPreview } from "../../../components/social-card-preview";
import { MetadataTable } from "./metadata-table";

interface OgPreviewResultsProps {
  labels: OgPreviewLabels;
  preview: Promise<PreviewState>;
}

// The shared social cards keep each platform's look; only their headings take the iOS
// grouped-section header style so they line up with the rest of the screen.
const socialCardsClassName =
  "flex flex-col gap-6 [&_h2]:px-5 [&_h2]:text-[15px] [&_h2]:leading-5 [&_h2]:font-semibold [&_h2]:tracking-[-0.23px] [&_h2]:text-ios-secondary-label [&>section]:gap-1.5";

export async function OgPreviewResults({ labels, preview }: OgPreviewResultsProps) {
  const state = await preview;
  if (state.status !== "success") return null;

  return (
    <>
      <Text className="px-5 text-ios-footnote break-all text-ios-secondary-label">
        {labels.previewing
          .replace("{url}", state.url)
          .replace("{duration}", String(state.durationMilliseconds))}
      </Text>
      <div className={socialCardsClassName}>
        <SocialCardPreview metadata={state.metadata} platform="twitter" title={labels.twitter} />
        <SocialCardPreview
          metadata={state.metadata}
          platform="open-graph"
          title={labels.openGraph}
        />
      </div>
      <MetadataTable
        heading={labels.metadata}
        description={labels.metadataDescription}
        tags={state.metadata.tags}
      />
    </>
  );
}
