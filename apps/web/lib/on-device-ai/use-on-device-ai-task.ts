"use client";

import { useEffect, useRef, useState } from "react";

import type { IosIntelligenceStatus } from "../../components/ios/ios-intelligence-card";

import { isAbortError, monitorDownload } from "./on-device-ai-session";

interface OnDeviceAiTaskContext {
  /** Pass to `create()` so the card shows model download progress. */
  monitor: (monitor: AICreateMonitor) => void;
  signal: AbortSignal;
}

/**
 * Runs one on-device AI request at a time and tracks its status for `IosIntelligenceCard`.
 * Starting a new request or unmounting cancels the previous one.
 */
export function useOnDeviceAiTask() {
  const [status, setStatus] = useState<IosIntelligenceStatus>({ kind: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(function cancelOnUnmount() {
    return function abortRunningTask() {
      controllerRef.current?.abort();
    };
  }, []);

  async function run<Result>(
    task: (context: OnDeviceAiTaskContext) => Promise<Result>,
  ): Promise<Result | undefined> {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus({ kind: "working" });
    try {
      const result = await task({
        monitor: monitorDownload(function showDownloadProgress(progress) {
          if (controller.signal.aborted) return;
          setStatus(
            progress > 0 && progress < 1 ? { kind: "downloading", progress } : { kind: "working" },
          );
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return undefined;
      setStatus({ kind: "done" });
      return result;
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) setStatus({ kind: "error" });
      return undefined;
    }
  }

  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus({ kind: "idle" });
  }

  return { reset, run, status };
}
