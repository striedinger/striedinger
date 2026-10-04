"use client";

import { BracesIcon } from "@workspace/icons/braces-icon";
import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { Text } from "@workspace/ui/components/text";
import { startTransition, useEffect, useRef, useState, type ChangeEvent } from "react";

import type { JsonWorkerReply, JsonWorkerRequest, JsonWorkerResponse } from "./process-json";
import type { JsonParseResult, JsonToolLabels } from "./types";

import { JsonPane } from "./json-pane";
import { JsonTree } from "./json-tree";

interface JsonToolProps {
  labels: JsonToolLabels;
}

const maximumInputCharacters = 500_000;

export function JsonTool({ labels }: JsonToolProps) {
  const [input, setInput] = useState("");
  const [validationResult, setValidationResult] = useState<JsonParseResult>({ status: "empty" });
  // The preview keeps showing the last valid document while new text is checked, instead of
  // emptying on every keystroke.
  const [previewResult, setPreviewResult] = useState<JsonParseResult>({ status: "empty" });
  const [isPreviewStale, setIsPreviewStale] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [defaultExpanded, setDefaultExpanded] = useState(true);
  const processedInput = useRef<string | undefined>(undefined);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(function stopWorkerOnUnmount() {
    return function terminateWorker() {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(
    function validateAndFormatAfterIdle() {
      if (!input.trim() || input.length > maximumInputCharacters) {
        return;
      }
      if (processedInput.current === input) {
        processedInput.current = undefined;
        return;
      }

      const requestId = ++requestIdRef.current;
      const timeoutId = window.setTimeout(function validateAndFormatInput() {
        if (typeof Worker === "undefined") {
          void import("./process-json").then(function processWithoutWorker({ processJson }) {
            applyValidationResult(processJson(input));
            return undefined;
          });
          return;
        }
        getWorker().postMessage({ id: requestId, input } satisfies JsonWorkerRequest);
      }, 1_000);

      // One worker is reused for every check; replies for text that has since changed are ignored.
      function getWorker() {
        if (workerRef.current) return workerRef.current;
        const jsonWorker = new Worker(new URL("./json-worker.ts", import.meta.url), {
          type: "module",
        });
        jsonWorker.addEventListener(
          "message",
          function handleWorkerResult(event: MessageEvent<JsonWorkerReply>) {
            if (event.data.id === requestIdRef.current) applyValidationResult(event.data.response);
          },
        );
        jsonWorker.addEventListener("error", function handleWorkerError() {
          jsonWorker.terminate();
          workerRef.current = null;
          applyValidationResult({ result: { status: "invalid", error: labels.tooComplex } });
        });
        workerRef.current = jsonWorker;
        return jsonWorker;
      }

      function applyValidationResult(response: JsonWorkerResponse) {
        if (requestId !== requestIdRef.current) return;
        // Rendering a large tree is interruptible, so typing stays responsive.
        startTransition(function showValidationResult() {
          setValidationResult(response.result);
          if (response.result.status === "valid") setPreviewResult(response.result);
          setIsPreviewStale(false);
        });

        if (response.formattedInput && response.formattedInput !== input) {
          processedInput.current = response.formattedInput;
          setInput(response.formattedInput);
        }
      }

      return function cancelPendingValidation() {
        window.clearTimeout(timeoutId);
      };
    },
    [input, labels.tooComplex],
  );

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextInput = event.currentTarget.value;
    setInput(nextInput);
    if (!nextInput.trim()) {
      requestIdRef.current++;
      setValidationResult({ status: "empty" });
      setPreviewResult({ status: "empty" });
      setIsPreviewStale(false);
      return;
    }
    setValidationResult(
      nextInput.length > maximumInputCharacters
        ? { status: "invalid", error: labels.tooLarge, reason: "too-large" }
        : { status: "empty" },
    );
    setIsPreviewStale(true);
  }

  function handleToggleAll() {
    setDefaultExpanded(function toggleDefaultExpanded(currentDefaultExpanded) {
      return !currentDefaultExpanded;
    });
    setTreeVersion(function incrementTreeVersion(currentVersion) {
      return currentVersion + 1;
    });
  }

  const canToggleAll = previewResult.status === "valid" && previewResult.previewable !== false;
  const isPreviewDimmed = isPreviewStale && previewResult.status === "valid";

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-5">
      <JsonPane
        heading={labels.inputLabel}
        headingId="json-input-heading"
        footer={
          <div className="flex flex-col gap-1" aria-live="polite">
            {validationResult.status === "valid" ? (
              <Text className="flex items-center gap-1.5 text-ios-footnote font-semibold text-ios-green [&_svg]:size-4">
                <CheckCircleIcon aria-hidden="true" />
                {labels.valid}
              </Text>
            ) : null}
            {validationResult.status === "invalid" ? (
              <Text className="text-ios-footnote break-words text-ios-red">
                {validationResult.reason === "too-large"
                  ? validationResult.error
                  : labels.invalid.replace("{error}", validationResult.error)}
              </Text>
            ) : null}
            <Text className="text-ios-footnote text-ios-secondary-label">{labels.privacy}</Text>
          </div>
        }
      >
        <div className="overflow-hidden rounded-ios-xl bg-ios-grouped-cell transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ios-tint/35 motion-reduce:transition-none">
          <textarea
            className="block h-88 w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[14px] leading-[22px] text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label lg:h-128"
            value={input}
            onChange={handleInputChange}
            placeholder={labels.placeholder}
            aria-label={labels.inputLabel}
            aria-invalid={validationResult.status === "invalid"}
            maxLength={maximumInputCharacters}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </JsonPane>

      <JsonPane
        heading={labels.preview}
        headingId="json-preview-heading"
        action={
          <button
            type="button"
            className="-my-1 rounded-full px-1 text-ios-subheadline text-ios-tint outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-50 disabled:text-ios-tertiary-label"
            onClick={handleToggleAll}
            disabled={!canToggleAll}
          >
            {defaultExpanded ? labels.collapseAll : labels.expandAll}
          </button>
        }
      >
        <div
          className="h-88 overflow-auto overscroll-contain rounded-ios-xl bg-ios-grouped-cell px-3 py-3 transition-opacity duration-200 data-stale:opacity-60 motion-reduce:transition-none lg:h-128"
          data-stale={isPreviewDimmed ? "" : undefined}
          aria-busy={isPreviewStale}
        >
          {canToggleAll ? (
            <JsonTree
              key={treeVersion}
              collapseLabel={labels.collapseValue}
              defaultExpanded={defaultExpanded}
              expandLabel={labels.expandValue}
              value={previewResult.value}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 px-8 text-center">
              <BracesIcon
                aria-hidden="true"
                className="size-11 text-ios-tertiary-label"
                strokeWidth={1.6}
              />
              <Text className="max-w-xs text-ios-subheadline text-ios-secondary-label">
                {previewResult.status === "valid" ? labels.tooComplex : labels.emptyPreview}
              </Text>
            </div>
          )}
        </div>
      </JsonPane>
    </div>
  );
}
