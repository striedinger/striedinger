import type { CompressionMode, OptimizationStage, OutputFormat } from "./types";

interface OptimizeImageOptions {
  compressionMode: CompressionMode;
  maxDimension: number;
  outputFormat: OutputFormat;
  quality: number;
}

interface PendingOptimization {
  onProgress?: ProgressCallback | undefined;
  reject: (error: Error) => void;
  resolve: (blob: Blob) => void;
}

/** What image-worker.ts posts back: progress while it works, then a result or an error. */
type ImageWorkerReply =
  | { id: string; progress: number; stage: OptimizationStage }
  | { blob: Blob; id: string; type: string }
  | { error: string; id: string };

export type ProgressCallback = (progress: number, stage: OptimizationStage) => void;

const pendingOptimizations = new Map<string, PendingOptimization>();
let sharedWorker: Worker | undefined;

export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(4, "preparing");
  const isHeic = isHeicFile(file);
  const bitmap = isHeic ? await decodeHeic(file, onProgress) : undefined;
  const buffer =
    !bitmap || options.compressionMode === "lossless" ? await file.arrayBuffer() : undefined;
  const id = crypto.randomUUID();
  const worker = getWorker();

  return new Promise(function runWorker(resolve, reject) {
    pendingOptimizations.set(id, { onProgress, reject, resolve });
    const message = {
      bitmap,
      buffer,
      compressionMode: options.compressionMode,
      id,
      maxDimension: options.maxDimension,
      originalSize: file.size,
      outputFormat: options.outputFormat,
      quality: options.quality,
      type: file.type,
    };
    const transferables: Transferable[] = [];
    if (bitmap) transferables.push(bitmap);
    if (buffer) transferables.push(buffer);
    worker.postMessage(message, transferables);
  });
}

/**
 * Stops the encode in progress, which can take seconds for AVIF, when its result is no longer
 * wanted. The worker restarts on the next request; the browser keeps its codecs cached.
 */
export function cancelImageOptimizations() {
  for (const pending of pendingOptimizations.values()) {
    pending.reject(new DOMException("The optimization was canceled.", "AbortError"));
  }
  pendingOptimizations.clear();
  sharedWorker?.terminate();
  sharedWorker = undefined;
}

async function decodeHeic(file: File, onProgress?: ProgressCallback) {
  onProgress?.(8, "decoding");
  const { heicTo } = await import("heic-to/next");
  const bitmap = await heicTo({ blob: file, type: "bitmap" });
  onProgress?.(24, "decoding");
  return bitmap;
}

function isHeicFile(file: File) {
  return (
    file.type === "image/heic" || file.type === "image/heif" || /\.(?:heic|heif)$/i.test(file.name)
  );
}

function getWorker() {
  if (sharedWorker) return sharedWorker;

  sharedWorker = new Worker(new URL("./image-worker.ts", import.meta.url), { type: "module" });
  sharedWorker.addEventListener(
    "message",
    function receiveResult(event: MessageEvent<ImageWorkerReply>) {
      const reply = event.data;
      const pending = pendingOptimizations.get(reply.id);
      if (!pending) return;

      if ("progress" in reply) {
        pending.onProgress?.(reply.progress, reply.stage);
        return;
      }

      pendingOptimizations.delete(reply.id);
      if ("error" in reply) {
        pending.reject(new Error(reply.error));
        return;
      }

      pending.resolve(reply.blob);
    },
  );
  sharedWorker.addEventListener("error", function receiveError() {
    for (const pending of pendingOptimizations.values()) {
      pending.reject(new Error("This browser could not optimize the image."));
    }

    pendingOptimizations.clear();
    sharedWorker?.terminate();
    sharedWorker = undefined;
  });
  return sharedWorker;
}
