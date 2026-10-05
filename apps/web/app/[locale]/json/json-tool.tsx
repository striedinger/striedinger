"use client";

import { BracesIcon } from "@workspace/icons/braces-icon";
import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useEffectEvent,
  useOptimistic,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { JsonWorkerReply, JsonWorkerRequest } from "./process-json";
import type { JsonParseResult, JsonToolLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosGroupedPane } from "../../../components/ios/ios-grouped-pane";
import { defineOnDeviceAiProbe, useOnDeviceAi } from "../../../lib/on-device-ai/use-on-device-ai";
import { getJsonQuestionOptions } from "./json-intelligence-options";
import { JsonTree } from "./json-tree";

interface JsonToolProps {
  aiLabels: OnDeviceAiLabels;
  labels: JsonToolLabels;
  locale: string;
}

function loadJsonIntelligencePanel() {
  return import("./json-intelligence-panel");
}

const JsonIntelligencePanel = lazy(function importJsonIntelligencePanel() {
  return loadJsonIntelligencePanel().then(function selectPanel(module) {
    return { default: module.JsonIntelligencePanel };
  });
});

function preloadJsonIntelligencePanel() {
  void loadJsonIntelligencePanel();
}

const maximumInputCharacters = 500_000;

export function JsonTool({ aiLabels, labels, locale }: JsonToolProps) {
  const [input, setInput] = useState("");
  const [validationResult, setValidationResult] = useState<JsonParseResult>({ status: "empty" });
  // The preview keeps showing the last valid document while new text is checked, instead of
  // emptying on every keystroke.
  const [previewResult, setPreviewResult] = useState<JsonParseResult>({ status: "empty" });
  const [isPreviewStale, setIsPreviewStale] = useState(false);
  const [treeVersion, setTreeVersion] = useState(0);
  const [defaultExpanded, setDefaultExpanded] = useState(true);
  const [displayedExpanded, toggleDisplayedExpanded] = useOptimistic(
    defaultExpanded,
    function toggleExpanded(currentExpanded: boolean) {
      return !currentExpanded;
    },
  );
  const [isAiOpen, setIsAiOpen] = useState(false);
  // Questions about the document appear only once the browser confirms on-device AI.
  const canAsk = useOnDeviceAi(
    defineOnDeviceAiProbe("LanguageModel", `json-question:${locale}`, function checkQuestions() {
      return LanguageModel.availability(getJsonQuestionOptions(locale));
    }),
  );
  const processedInput = useRef<string | undefined>(undefined);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(function stopWorkerOnUnmount() {
    return function terminateWorker() {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // The worker outlives any one effect run, so its replies go through an effect event that
  // always sees the latest request.
  const applyValidationResult = useEffectEvent(function applyValidationResult(
    reply: JsonWorkerReply,
  ) {
    if (reply.id !== requestIdRef.current) return;
    // Rendering a large tree is interruptible, so typing stays responsive.
    startTransition(function showValidationResult() {
      setValidationResult(reply.response.result);
      if (reply.response.result.status === "valid") setPreviewResult(reply.response.result);
      setIsPreviewStale(false);
    });
    const { formattedInput } = reply.response;
    if (formattedInput && formattedInput !== reply.input) {
      processedInput.current = formattedInput;
      setInput(formattedInput);
    }
  });

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
            applyValidationResult({ id: requestId, input, response: processJson(input) });
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
            applyValidationResult(event.data);
          },
        );
        jsonWorker.addEventListener("error", function handleWorkerError() {
          jsonWorker.terminate();
          workerRef.current = null;
          applyValidationResult({
            id: requestIdRef.current,
            input: "",
            response: { result: { status: "invalid", error: labels.tooComplex } },
          });
        });
        workerRef.current = jsonWorker;
        return jsonWorker;
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

  // Rebuilding a large tree can take a while, so the button flips at once and the tree
  // re-renders in a transition that keeps the page responsive.
  function handleToggleAll() {
    startTransition(function rebuildTree() {
      toggleDisplayedExpanded(undefined);
      setDefaultExpanded(function toggleDefaultExpanded(currentExpanded) {
        return !currentExpanded;
      });
      setTreeVersion(function incrementTreeVersion(currentVersion) {
        return currentVersion + 1;
      });
    });
  }

  const canToggleAll = previewResult.status === "valid" && previewResult.previewable !== false;
  const isPreviewDimmed = isPreviewStale && previewResult.status === "valid";

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-5">
      <IosGroupedPane
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
      </IosGroupedPane>

      <IosGroupedPane
        heading={labels.preview}
        headingId="json-preview-heading"
        action={
          <button
            type="button"
            className="-my-1 rounded-full px-1 text-ios-subheadline text-ios-tint outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-50 disabled:text-ios-tertiary-label"
            onClick={handleToggleAll}
            disabled={!canToggleAll}
          >
            {displayedExpanded ? labels.collapseAll : labels.expandAll}
          </button>
        }
      >
        <div
          className="h-88 overflow-auto overscroll-contain rounded-ios-xl bg-ios-grouped-cell px-3 py-3 transition-opacity duration-200 data-stale:opacity-60 motion-reduce:transition-none lg:h-128"
          data-stale={isPreviewDimmed ? "" : undefined}
          aria-busy={isPreviewStale || displayedExpanded !== defaultExpanded}
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
      </IosGroupedPane>

      {canAsk && (isAiOpen || validationResult.status === "valid") ? (
        isAiOpen ? (
          <Suspense fallback={null}>
            <JsonIntelligencePanel
              aiLabels={aiLabels}
              json={validationResult.status === "valid" ? input : null}
              labels={labels}
              locale={locale}
              onClose={function closeAi() {
                setIsAiOpen(false);
              }}
            />
          </Suspense>
        ) : (
          <div className="flex lg:col-span-2">
            <button
              type="button"
              className={`${iosChipButtonClassName} h-9 gap-1.5 [&_svg]:size-4`}
              onPointerEnter={preloadJsonIntelligencePanel}
              onFocus={preloadJsonIntelligencePanel}
              onClick={function openAi() {
                setIsAiOpen(true);
              }}
            >
              <SparklesIcon aria-hidden="true" />
              {labels.aiTitle}
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
