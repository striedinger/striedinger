"use client";

import { ChevronDownIcon } from "@workspace/icons/chevron-down-icon";
import { ChevronUpIcon } from "@workspace/icons/chevron-up-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEffect, useState, type ChangeEvent } from "react";
import { JsonTree } from "./json-tree";
import { parseJson } from "./parse-json";
import type { JsonParseResult, JsonToolLabels } from "./types";

interface JsonToolProps {
  labels: JsonToolLabels;
}

export function JsonTool({ labels }: JsonToolProps) {
  const [input, setInput] = useState("");
  const [validationResult, setValidationResult] = useState<JsonParseResult>({ status: "empty" });
  const [treeVersion, setTreeVersion] = useState(0);
  const [defaultExpanded, setDefaultExpanded] = useState(true);
  const previewResult = validationResult;

  useEffect(
    function validateAndFormatAfterIdle() {
      if (!input.trim()) {
        setValidationResult({ status: "empty" });
        return;
      }

      const timeoutId = window.setTimeout(function validateAndFormatInput() {
        const result = parseJson(input);
        setValidationResult(result);

        if (result.status === "valid") {
          const formattedInput = JSON.stringify(result.value, null, 2);

          if (formattedInput !== input) {
            setInput(formattedInput);
          }
        }
      }, 1_000);

      return function cancelPendingValidation() {
        window.clearTimeout(timeoutId);
      };
    },
    [input],
  );

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.currentTarget.value);
    setValidationResult({ status: "empty" });
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
              {labels.invalid.replace("{error}", validationResult.error)}
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

        <div className="relative h-[32rem] min-h-[32rem] overflow-auto rounded-xl border border-border/70 bg-card p-4 pt-12 shadow-sm">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 bg-card"
            onClick={handleToggleAll}
            disabled={previewResult.status !== "valid"}
            aria-label={defaultExpanded ? labels.collapseAll : labels.expandAll}
            title={defaultExpanded ? labels.collapseAll : labels.expandAll}
          >
            {defaultExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          {previewResult.status === "valid" ? (
            <JsonTree
              key={treeVersion}
              collapseLabel={labels.collapseValue}
              defaultExpanded={defaultExpanded}
              expandLabel={labels.expandValue}
              value={previewResult.value}
            />
          ) : (
            <Text size="sm" tone="muted">
              {labels.emptyPreview}
            </Text>
          )}
        </div>
      </section>
    </div>
  );
}
