"use client";

import { useSyncExternalStore } from "react";

export type OnDeviceAiApi =
  | "LanguageDetector"
  | "LanguageModel"
  | "Proofreader"
  | "Rewriter"
  | "Summarizer"
  | "Translator";

/** One question for the browser, such as "can it summarize into Spanish?", asked once. */
export interface OnDeviceAiProbe {
  api: OnDeviceAiApi;
  check: () => Promise<AIAvailability>;
  key: string;
}

const probes = new Map<string, OnDeviceAiProbe>();
const results = new Map<string, boolean>();
const pendingKeys = new Set<string>();
const listeners = new Set<() => void>();

/** True when the browser exposes the API at all. Costs one property lookup and no download. */
export function hasOnDeviceAi(api: OnDeviceAiApi) {
  return typeof globalThis === "object" && api in globalThis;
}

/**
 * Describes an availability check. Probes with the same API and key are the same object, so
 * components can create them during render.
 */
export function defineOnDeviceAiProbe(
  api: OnDeviceAiApi,
  key: string,
  check: () => Promise<AIAvailability>,
): OnDeviceAiProbe {
  const probeKey = `${api}:${key}`;
  let probe = probes.get(probeKey);
  if (!probe) {
    probe = { api, check, key: probeKey };
    probes.set(probeKey, probe);
  }
  return probe;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

function startProbe(probe: OnDeviceAiProbe) {
  // A missing API is not remembered: checking again costs one property lookup.
  if (results.has(probe.key) || pendingKeys.has(probe.key) || !hasOnDeviceAi(probe.api)) return;
  pendingKeys.add(probe.key);
  probe
    .check()
    .then(
      function isUsable(availability) {
        // A model that still has to download counts: the first use starts the download.
        return availability !== "unavailable";
      },
      function treatErrorAsUnavailable() {
        return false;
      },
    )
    .then(function storeResult(isAvailable) {
      pendingKeys.delete(probe.key);
      results.set(probe.key, isAvailable);
      notifyListeners();
      return undefined;
    })
    .catch(function ignoreListenerErrors() {
      return undefined;
    });
}

/**
 * Whether an on-device AI feature can run here. False on the server, during hydration, and in
 * every browser without the API, so features render nothing until the browser confirms them
 * and stay invisible everywhere else.
 */
export function useOnDeviceAi(probe: OnDeviceAiProbe | null) {
  return useSyncExternalStore(
    function subscribeToAvailability(listener) {
      listeners.add(listener);
      if (probe) startProbe(probe);
      return function unsubscribeFromAvailability() {
        listeners.delete(listener);
      };
    },
    function readAvailability() {
      return probe ? results.get(probe.key) === true : false;
    },
    function readServerAvailability() {
      return false;
    },
  );
}
