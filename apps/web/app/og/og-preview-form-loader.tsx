import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { loadPreviewMetadata } from "./load-preview-metadata";
import { OgPreviewForm } from "./og-preview-form";

interface OgPreviewFormLoaderProps {
  initialUrl: string;
  labels: OgPreviewLabels;
}

export async function OgPreviewFormLoader({ initialUrl, labels }: OgPreviewFormLoaderProps) {
  const initialState: PreviewState = initialUrl
    ? await loadPreviewMetadata(initialUrl)
    : { status: "idle", url: initialUrl };

  return <OgPreviewForm initialState={initialState} labels={labels} />;
}
