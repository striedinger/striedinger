import type {
  SvgOptimizationOptions,
  SvgWorkerRequest,
  SvgWorkerResponse,
} from "./svg-optimization";

/** Optimizes SVG markup with SVGO, off the main thread where workers exist. */
export async function optimizeSvgText(source: string, options: SvgOptimizationOptions) {
  if (typeof Worker === "undefined") {
    return (await import("./svg-optimization")).optimizeSvgSource(source, options);
  }
  return optimizeInWorker({ ...options, source });
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
