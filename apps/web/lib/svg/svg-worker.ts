/// <reference lib="webworker" />

import {
  optimizeSvgSource,
  type SvgWorkerRequest,
  type SvgWorkerResponse,
} from "./svg-optimization";

self.addEventListener(
  "message",
  function optimizeSvgMessage(event: MessageEvent<SvgWorkerRequest>) {
    let response: SvgWorkerResponse;
    try {
      response = { data: optimizeSvgSource(event.data.source, event.data) };
    } catch (error) {
      response = {
        error: error instanceof Error ? error.message : "This SVG could not be optimized.",
      };
    }
    self.postMessage(response);
  },
);
