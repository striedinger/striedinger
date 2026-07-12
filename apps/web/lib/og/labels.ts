import type { PreviewErrorCode } from "./types";

export interface OgPreviewLabels {
  button: string;
  checking: string;
  description: string;
  errors: Readonly<Record<PreviewErrorCode, string>>;
  from: string;
  heading: string;
  metadata: string;
  metadataDescription: string;
  openGraph: string;
  previewRegion: string;
  previewing: string;
  security: string;
  twitter: string;
  urlLabel: string;
  urlPlaceholder: string;
}
