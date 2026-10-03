import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

import type { PdfOperationStage } from "./types";

/* oxlint-disable no-await-in-loop -- Rasterize one page at a time to bound canvas and decoded-image memory. */

export interface RasterizePdfOptions {
  password?: string;
  quality: number;
}

export type RasterizeProgressCallback = (progress: number, stage: PdfOperationStage) => void;

type PageCanvas = HTMLCanvasElement | OffscreenCanvas;

/** Where pages are drawn: DOM canvases on the main thread, OffscreenCanvas in a worker. */
export interface RasterizeEnvironment<Canvas extends PageCanvas> {
  createCanvas: (width: number, height: number) => Canvas;
  documentOptions?: Partial<DocumentInitParameters>;
  encodeJpeg: (canvas: Canvas, quality: number) => Promise<Blob>;
}

/**
 * Renders every page to a JPEG at a DPI derived from the quality setting and rebuilds the
 * PDF from those images, which is how "Smallest" mode shrinks image-heavy documents.
 */
export async function rasterizePdfDocument<Canvas extends PageCanvas>(
  data: Uint8Array,
  options: RasterizePdfOptions,
  environment: RasterizeEnvironment<Canvas>,
  onProgress?: RasterizeProgressCallback,
): Promise<ArrayBuffer> {
  onProgress?.(8, "preparing");
  // The legacy build polyfills recent JavaScript (such as Map#getOrInsertComputed) that
  // pdf.js 6's default build assumes, so PDFs open in current Safari and Chromium releases.
  const [{ PDFDocument }, pdfjs] = await Promise.all([
    import("pdf-lib"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  // Font and character map data published by scripts/sync-pdf-assets.mjs, needed to draw text
  // in fonts the document does not embed.
  const assetRoot = new URL(`/vendor/pdfjs-dist/${pdfjs.version}/`, globalThis.location.origin);
  const loadingTask = pdfjs.getDocument({
    cMapPacked: true,
    cMapUrl: new URL("cmaps/", assetRoot).href,
    standardFontDataUrl: new URL("standard_fonts/", assetRoot).href,
    wasmUrl: new URL("wasm/", assetRoot).href,
    ...environment.documentOptions,
    data,
    password: options.password || undefined,
  });
  try {
    const input = await loadingTask.promise;
    const output = await PDFDocument.create();
    const targetDpi = Math.round(84 + options.quality * 72);
    onProgress?.(20, "decoding");

    for (let pageNumber = 1; pageNumber <= input.numPages; pageNumber += 1) {
      const page = await input.getPage(pageNumber);
      const naturalViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: targetDpi / 72 });
      const canvas = environment.createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const context = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D | null;
      if (!context) throw new Error("Canvas is unavailable in this browser.");

      try {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        // pdf.js only reads the canvas size, so an OffscreenCanvas works in place of a DOM one.
        await page.render({ canvas: canvas as HTMLCanvasElement, canvasContext: context, viewport })
          .promise;
        const jpeg = await environment.encodeJpeg(canvas, options.quality);
        const embeddedPage = await output.embedJpg(await jpeg.arrayBuffer());
        const outputPage = output.addPage([naturalViewport.width, naturalViewport.height]);
        outputPage.drawImage(embeddedPage, {
          height: naturalViewport.height,
          width: naturalViewport.width,
          x: 0,
          y: 0,
        });
        onProgress?.(20 + Math.round((pageNumber / input.numPages) * 70), "compressing");
      } finally {
        page.cleanup();
        canvas.width = 1;
        canvas.height = 1;
      }
    }

    const bytes = await output.save({ useObjectStreams: true });
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } finally {
    await loadingTask.destroy();
  }
}
