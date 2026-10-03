/// <reference lib="webworker" />

import type { PdfOperationStage } from "./types";

import { rasterizeMessageSource } from "./rasterize-message-source";
import { rasterizePdfDocument, type RasterizePdfOptions } from "./rasterize-pdf-document";

export interface RasterizeWorkerRequest {
  data: ArrayBuffer;
  options: RasterizePdfOptions;
}

export type RasterizeWorkerMessage = { source: typeof rasterizeMessageSource } & (
  | { type: "progress"; progress: number; stage: PdfOperationStage }
  | { type: "done"; bytes: ArrayBuffer }
  | { type: "error"; message: string }
);

/** pdf.js draws its intermediate canvases (patterns, masks) on OffscreenCanvas here. */
class OffscreenCanvasFactory {
  create(width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
  }

  reset(canvasAndContext: { canvas: OffscreenCanvas }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
    }
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

interface BinaryDataUrls {
  cMapUrl?: string | null;
  standardFontDataUrl?: string | null;
  wasmUrl?: string | null;
}

/** Loads font, character map, and decoder data with fetch; the default reads `document`. */
class WorkerBinaryDataFactory {
  #urls: BinaryDataUrls;

  constructor(urls: BinaryDataUrls) {
    this.#urls = urls;
  }

  async fetch({ filename, kind }: { filename: string; kind: keyof BinaryDataUrls }) {
    const baseUrl = this.#urls[kind];
    if (!baseUrl) throw new Error(`Ensure that the \`${kind}\` API parameter is provided.`);
    const url = `${baseUrl}${filename}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load data at: ${url}`);
    const isTextCMap = kind === "cMapUrl" && !url.endsWith(".bcmap");
    return isTextCMap
      ? new TextEncoder().encode(await response.text())
      : new Uint8Array(await response.arrayBuffer());
  }
}

/** SVG filters need a DOM; without them pdf.js renders the few affected images unfiltered. */
class NoFilterFactory {
  addFilter() {
    return "none";
  }
  addHCMFilter() {
    return "none";
  }
  addAlphaFilter() {
    return "none";
  }
  addLuminosityFilter() {
    return "none";
  }
  addKnockoutFilter() {
    return "none";
  }
  addHighlightHCMFilter() {
    return "none";
  }
  addSelectionHCMFilter() {
    return "none";
  }
  addSelectionFilter() {
    return "none";
  }
  createSelectionStyle() {
    return null;
  }
  destroy() {}
}

function post(
  message: DistributiveOmit<RasterizeWorkerMessage, "source">,
  transfer: Transferable[] = [],
) {
  self.postMessage({ ...message, source: rasterizeMessageSource }, transfer);
}

type DistributiveOmit<Value, Key extends PropertyKey> = Value extends unknown
  ? Omit<Value, Key>
  : never;

declare global {
  var pdfjsWorker: { WorkerMessageHandler: unknown } | undefined;
}

self.addEventListener(
  "message",
  async function rasterizeInWorker(event: MessageEvent<RasterizeWorkerRequest>) {
    try {
      // pdf.js runs its parser in this worker too, instead of starting a nested worker.
      globalThis.pdfjsWorker ??= await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
      const bytes = await rasterizePdfDocument(
        new Uint8Array(event.data.data),
        event.data.options,
        {
          createCanvas(width, height) {
            return new OffscreenCanvas(width, height);
          },
          // Without a DOM, glyphs are drawn as paths instead of loading web fonts.
          documentOptions: {
            BinaryDataFactory: WorkerBinaryDataFactory,
            CanvasFactory: OffscreenCanvasFactory,
            FilterFactory: NoFilterFactory,
            disableFontFace: true,
            isOffscreenCanvasSupported: true,
            useSystemFonts: false,
          },
          encodeJpeg(canvas, quality) {
            return canvas.convertToBlob({ type: "image/jpeg", quality });
          },
        },
        function reportProgress(progress, stage) {
          post({ type: "progress", progress, stage });
        },
      );
      post({ type: "done", bytes }, [bytes]);
    } catch (error) {
      post({
        type: "error",
        message: error instanceof Error ? error.message : "The PDF could not be processed.",
      });
    }
  },
);
