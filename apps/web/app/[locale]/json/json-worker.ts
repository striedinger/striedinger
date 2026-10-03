/// <reference lib="webworker" />

import type { JsonWorkerRequest, JsonWorkerReply } from "./process-json";

import { processJson } from "./process-json";

self.addEventListener("message", function parseJsonMessage(event: MessageEvent<JsonWorkerRequest>) {
  const reply: JsonWorkerReply = { id: event.data.id, response: processJson(event.data.input) };
  self.postMessage(reply);
});
