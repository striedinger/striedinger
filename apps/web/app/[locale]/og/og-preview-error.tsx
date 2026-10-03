import { Text } from "@workspace/ui/components/text";

import type { OgPreviewLabels } from "../../../lib/og/labels";
import type { PreviewState } from "../../../lib/og/types";

interface OgPreviewErrorProps {
  labels: OgPreviewLabels;
  preview: Promise<PreviewState>;
}

export async function OgPreviewError({ labels, preview }: OgPreviewErrorProps) {
  const state = await preview;
  if (state.status !== "error") return null;

  return (
    <Text size="sm" tone="destructive">
      {labels.errors[state.error]}
    </Text>
  );
}
