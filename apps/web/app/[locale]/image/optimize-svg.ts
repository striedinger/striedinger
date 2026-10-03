import type { ProgressCallback } from "./optimize-image";
import type { SvgWorkerRequest, SvgWorkerResponse } from "./svg-optimization";
import type { CompressionMode } from "./types";

export async function optimizeSvg(
  file: File,
  compressionMode: CompressionMode,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(12, "preparing");
  const source = await file.text();
  onProgress?.(58, "compressing");
  const data =
    typeof Worker === "undefined"
      ? (await import("./svg-optimization")).optimizeSvgSource(source, compressionMode)
      : await optimizeInWorker({ compressionMode, source });
  onProgress?.(94, "comparing");
  return new Blob([data], { type: "image/svg+xml" });
}

/** Multipass SVGO can take seconds on large drawings, so it runs off the main thread. */
function optimizeInWorker(request: SvgWorkerRequest): Promise<string> {
  const worker = new Worker(new URL("./svg-worker.ts", import.meta.url), { type: "module" });
  return new Promise<string>(function waitForOptimizedSvg(resolve, reject) {
    worker.addEventListener(
      "message",
      function handleResult(event: MessageEvent<SvgWorkerResponse>) {
        worker.terminate();
        if ("data" in event.data) resolve(event.data.data);
        else reject(new Error(event.data.error));
      },
    );
    worker.addEventListener("error", function handleError() {
      worker.terminate();
      reject(new Error("This SVG could not be optimized."));
    });
    worker.postMessage(request);
  });
}
