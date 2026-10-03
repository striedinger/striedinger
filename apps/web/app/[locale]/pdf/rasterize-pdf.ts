import type { RasterizeWorkerMessage, RasterizeWorkerRequest } from "./rasterize-pdf-worker";

import { rasterizeMessageSource } from "./rasterize-message-source";
import {
  rasterizePdfDocument,
  type RasterizePdfOptions,
  type RasterizeProgressCallback,
} from "./rasterize-pdf-document";

/**
 * "Smallest" mode renders every page, which can take seconds on long documents, so it runs in
 * a worker with OffscreenCanvas and falls back to the main thread only where that is missing.
 */
export async function rasterizePdf(
  file: File,
  options: RasterizePdfOptions,
  onProgress?: RasterizeProgressCallback,
): Promise<Blob> {
  const data = await file.arrayBuffer();
  const bytes =
    typeof Worker === "function" && typeof OffscreenCanvas === "function"
      ? await rasterizeInWorker({ data, options }, onProgress)
      : await rasterizePdfDocument(
          new Uint8Array(data),
          options,
          {
            createCanvas(width, height) {
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              return canvas;
            },
            encodeJpeg: canvasToJpeg,
          },
          onProgress,
        );
  return new Blob([bytes], { type: "application/pdf" });
}

function rasterizeInWorker(
  request: RasterizeWorkerRequest,
  onProgress?: RasterizeProgressCallback,
): Promise<ArrayBuffer> {
  const worker = new Worker(new URL("./rasterize-pdf-worker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise<ArrayBuffer>(function waitForRasterizedPdf(resolve, reject) {
    worker.addEventListener(
      "message",
      function handleWorkerMessage(event: MessageEvent<RasterizeWorkerMessage>) {
        const message = event.data;
        // pdf.js also announces itself from inside the worker; only our replies are handled.
        if (message?.source !== rasterizeMessageSource) return;
        if (message.type === "progress") {
          onProgress?.(message.progress, message.stage);
          return;
        }
        worker.terminate();
        if (message.type === "done") resolve(message.bytes);
        else reject(new Error(message.message));
      },
    );
    worker.addEventListener("error", function handleWorkerError() {
      worker.terminate();
      reject(new Error("The PDF could not be processed."));
    });
    worker.postMessage(request, [request.data]);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise(function createBlob(resolve, reject) {
    canvas.toBlob(
      function handleBlob(blob) {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("A PDF page could not be encoded."));
      },
      "image/jpeg",
      quality,
    );
  });
}
