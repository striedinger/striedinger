import { Text } from "@workspace/ui/components/text";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { SocialCardPreview } from "../../components/social-card-preview";
import { MetadataTable } from "./metadata-table";

interface OgPreviewResultsProps {
  labels: OgPreviewLabels;
  preview: Promise<PreviewState>;
}

export async function OgPreviewResults({ labels, preview }: OgPreviewResultsProps) {
  const state = await preview;
  if (state.status !== "success") return null;

  return (
    <>
      <Text size="sm" tone="muted">
        {labels.previewing
          .replace("{url}", state.url)
          .replace("{duration}", String(state.durationMilliseconds))}
      </Text>
      <SocialCardPreview metadata={state.metadata} platform="twitter" title={labels.twitter} />
      <SocialCardPreview metadata={state.metadata} platform="open-graph" title={labels.openGraph} />
      <MetadataTable
        heading={labels.metadata}
        description={labels.metadataDescription}
        tags={state.metadata.tags}
      />
    </>
  );
}
