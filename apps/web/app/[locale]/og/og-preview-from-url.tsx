import type { OgPreviewLabels } from "../../../lib/og/labels";

import { loadPreviewMetadata } from "./load-preview-metadata";
import { OgPreviewForm } from "./og-preview-form";

interface OgPreviewFromUrlProps {
  action: string;
  labels: OgPreviewLabels;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The preview form, filled in and previewing the page a shared `?url=` link asks for. */
export async function OgPreviewFromUrl({ action, labels, searchParams }: OgPreviewFromUrlProps) {
  const { url } = await searchParams;
  const initialUrl = (Array.isArray(url) ? url[0] : url)?.slice(0, 2048).trim() ?? "";

  return (
    <OgPreviewForm
      action={action}
      defaultUrl={initialUrl}
      labels={labels}
      preview={initialUrl ? loadPreviewMetadata(initialUrl) : null}
    />
  );
}
