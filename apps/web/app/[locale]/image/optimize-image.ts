import type { CompressionMode, OptimizationStage, OutputFormat } from "./types";

interface OptimizeImageOptions {
  compressionMode: CompressionMode;
  maxDimension: number;
  outputFormat: OutputFormat;
  quality: number;
}

interface PendingOptimization {
  onProgress?: ProgressCallback;
  reject: (error: Error) => void;
  resolve: (blob: Blob) => void;
}

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
    if (bitmap) {
      const transferables: Transferable[] = [bitmap];
      if (buffer) transferables.push(buffer);
      worker.postMessage(message, transferables);
      return;
    }

    worker.postMessage(message, [buffer as ArrayBuffer]);
  });
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
  sharedWorker.addEventListener("message", function receiveResult(event) {
    const pending = pendingOptimizations.get(event.data.id);
    if (!pending) return;

    if (event.data.progress !== undefined) {
      pending.onProgress?.(event.data.progress, event.data.stage as OptimizationStage);
      return;
    }

    pendingOptimizations.delete(event.data.id);
    if (event.data.error) {
      pending.reject(new Error(event.data.error));
      return;
    }

    pending.resolve(event.data.blob as Blob);
  });
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
