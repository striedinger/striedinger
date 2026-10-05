"use client";

import { useEffect, useRef, useState } from "react";

import type { ExportReply, ExportRequest } from "./export-messages";

export type VideoExportState =
  | { kind: "idle" }
  | { kind: "exporting"; progress: number }
  | { file: File; kind: "done"; settingsKey: string }
  | { kind: "error" };

/**
 * Runs exports in a worker, so decoding, encoding, and writing never block the page. The
 * result remembers the settings it was made with, so changes invalidate it.
 */
export function useVideoExport() {
  const [state, setState] = useState<VideoExportState>({ kind: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const settingsKeyRef = useRef("");

  useEffect(function stopWorkerOnUnmount() {
    return function terminateWorker() {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  function startExport(request: Omit<ExportRequest, "kind">, settingsKey: string) {
    settingsKeyRef.current = settingsKey;
    if (!workerRef.current) {
      const worker = new Worker(new URL("./export-worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener("message", function handleReply(event: MessageEvent<ExportReply>) {
        const reply = event.data;
        if (reply.kind === "progress") setState({ kind: "exporting", progress: reply.progress });
        else if (reply.kind === "done") {
          setState({ file: reply.file, kind: "done", settingsKey: settingsKeyRef.current });
        } else if (reply.kind === "canceled") setState({ kind: "idle" });
        else setState({ kind: "error" });
      });
      workerRef.current = worker;
    }
    setState({ kind: "exporting", progress: 0 });
    workerRef.current.postMessage({ ...request, kind: "export" } satisfies ExportRequest);
  }

  function cancelExport() {
    workerRef.current?.postMessage({ kind: "cancel" });
  }

  return { cancelExport, startExport, state };
}
