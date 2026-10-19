import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

import { getPdfjsAssetOptions } from "./pdfjs-asset-options";

/**
 * Loads pdf.js and opens a document with the fonts, character maps, and image decoders it may
 * need, so every view of a PDF (preview, text, and rasterizing) reads it the same way.
 *
 * The legacy build polyfills recent JavaScript (such as Map#getOrInsertComputed) that pdf.js 6's
 * default build assumes, so PDFs open in current Safari and Chromium releases.
 */
export async function openPdfDocument(parameters: DocumentInitParameters) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  return pdfjs.getDocument({ ...getPdfjsAssetOptions(pdfjs.version), ...parameters });
}
