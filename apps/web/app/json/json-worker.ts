/// <reference lib="webworker" />

import { processJson } from "./process-json";

self.addEventListener("message", function parseJsonMessage(event: MessageEvent<string>) {
  self.postMessage(processJson(event.data));
});
