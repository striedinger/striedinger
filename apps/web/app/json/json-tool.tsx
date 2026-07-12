"use client";

import { ChevronDownIcon } from "@workspace/icons/chevron-down-icon";
import { ChevronUpIcon } from "@workspace/icons/chevron-up-icon";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type { JsonWorkerResponse } from "./process-json";
import type { JsonParseResult, JsonToolLabels } from "./types";

import { JsonTree } from "./json-tree";

interface JsonToolProps {
  labels: JsonToolLabels;
}

export function JsonTool({ labels }: JsonToolProps) {
  const maximumInputCharacters = 500_000;
  const [input, setInput] = useState("");
  const [validationResult, setValidationResult] = useState<JsonParseResult>({ status: "empty" });
  const [treeVersion, setTreeVersion] = useState(0);
  const [defaultExpanded, setDefaultExpanded] = useState(true);
  const processedInput = useRef<string | undefined>(undefined);
  const previewResult = validationResult;

  useEffect(
    function validateAndFormatAfterIdle() {
      if (!input.trim()) {
        return;
      }
      if (processedInput.current === input) {
        processedInput.current = undefined;
        return;
      }

      let worker: Worker | undefined;
      let cancelled = false;
      const timeoutId = window.setTimeout(function validateAndFormatInput() {
        if (typeof Worker === "undefined") {
          void import("./process-json").then(function processWithoutWorker({ processJson }) {
            applyValidationResult(processJson(input));
            return undefined;
          });
          return;
        }

        const jsonWorker = new Worker(new URL("./json-worker.ts", import.meta.url), {
          type: "module",
        });
        worker = jsonWorker;
        jsonWorker.addEventListener(
          "message",
          function handleWorkerResult(event: MessageEvent<JsonWorkerResponse>) {
            applyValidationResult(event.data);
            jsonWorker.terminate();
          },
        );
        jsonWorker.addEventListener("error", function handleWorkerError() {
          setValidationResult({ status: "invalid", error: labels.tooComplex });
          jsonWorker.terminate();
        });
      }, 1_000);

      function applyValidationResult(response: JsonWorkerResponse) {
        if (cancelled) return;
        setValidationResult(response.result);

        if (response.formattedInput && response.formattedInput !== input) {
          processedInput.current = response.formattedInput;
          setInput(response.formattedInput);
        }
      }

      return function cancelPendingValidation() {
        cancelled = true;
        window.clearTimeout(timeoutId);
        worker?.terminate();
      };
    },
    [input, labels.tooComplex],
  );

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextInput = event.currentTarget.value;
    setInput(nextInput);
    setValidationResult(
      nextInput.length > maximumInputCharacters
        ? { status: "invalid", error: labels.tooLarge, reason: "too-large" }
        : { status: "empty" },
    );
  }

  function handleToggleAll() {
    setDefaultExpanded(function toggleDefaultExpanded(currentDefaultExpanded) {
      return !currentDefaultExpanded;
    });
    setTreeVersion(function incrementTreeVersion(currentVersion) {
      return currentVersion + 1;
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-5" aria-labelledby="json-input-heading">
        <div className="flex h-8 items-center">
          <Text as="h2" id="json-input-heading" size="xl" weight="semibold">
            {labels.inputLabel}
          </Text>
        </div>

        <Textarea
          className="h-[32rem] min-h-[32rem] resize-none font-mono text-sm leading-6"
          value={input}
          onChange={handleInputChange}
          placeholder={labels.placeholder}
          aria-label={labels.inputLabel}
          aria-invalid={validationResult.status === "invalid"}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />

        <div className="flex flex-col gap-2" aria-live="polite">
          <Text size="sm" tone="muted">
            {labels.privacy}
          </Text>
          {validationResult.status === "valid" ? (
            <Text size="sm" className="text-json-string">
              {labels.valid}
            </Text>
          ) : null}
          {validationResult.status === "invalid" ? (
            <Text size="sm" tone="destructive">
              {validationResult.reason === "too-large"
                ? validationResult.error
                : labels.invalid.replace("{error}", validationResult.error)}
            </Text>
          ) : null}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-5" aria-labelledby="json-preview-heading">
        <div className="flex h-8 items-center">
          <Text as="h2" id="json-preview-heading" size="xl" weight="semibold">
            {labels.preview}
          </Text>
        </div>

        <Surface className="relative h-[32rem] min-h-[32rem] overflow-auto rounded-xl p-4 pt-12">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 bg-card"
            onClick={handleToggleAll}
            disabled={previewResult.status !== "valid" || previewResult.previewable === false}
            aria-label={defaultExpanded ? labels.collapseAll : labels.expandAll}
            title={defaultExpanded ? labels.collapseAll : labels.expandAll}
          >
            {defaultExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          {previewResult.status === "valid" && previewResult.previewable !== false ? (
            <JsonTree
              key={treeVersion}
              collapseLabel={labels.collapseValue}
              defaultExpanded={defaultExpanded}
              expandLabel={labels.expandValue}
              value={previewResult.value}
            />
          ) : previewResult.status === "valid" ? (
            <Text size="sm" tone="muted">
              {labels.tooComplex}
            </Text>
          ) : (
            <Text size="sm" tone="muted">
              {labels.emptyPreview}
            </Text>
          )}
        </Surface>
      </section>
    </div>
  );
}
