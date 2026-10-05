/// <reference lib="webworker" />

import type { JsonWorkerRequest, JsonWorkerReply } from "./process-json";

import { processJson } from "./process-json";

self.addEventListener("message", function parseJsonMessage(event: MessageEvent<JsonWorkerRequest>) {
  const reply: JsonWorkerReply = {
    id: event.data.id,
    input: event.data.input,
    response: processJson(event.data.input),
  };
  self.postMessage(reply);
});
