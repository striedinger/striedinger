"use client";

import { ChevronDownIcon } from "@workspace/icons/chevron-down-icon";
import { ChevronUpIcon } from "@workspace/icons/chevron-up-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { JsonValue } from "./types";

interface JsonTreeNodeProps {
  collapseLabel: string;
  defaultExpanded: boolean;
  expandLabel: string;
  name?: string;
  value: JsonValue;
}

export function JsonTreeNode({
  collapseLabel,
  defaultExpanded,
  expandLabel,
  name,
  value,
}: JsonTreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isArray = Array.isArray(value);
  const isObject = typeof value === "object" && value !== null && !isArray;
  const isContainer = isArray || isObject;

  if (!isContainer) {
    return (
      <div className="flex min-w-0 items-start gap-2 py-0.5">
        {name === undefined ? null : (
          <Text as="span" family="mono" size="sm" tone="muted" className="shrink-0">
            {JSON.stringify(name)}:
          </Text>
        )}
        <Text
          as="span"
          family="mono"
          size="sm"
          className={`break-all ${getPrimitiveClassName(value)}`}
        >
          {JSON.stringify(value)}
        </Text>
      </div>
    );
  }

  const entries = isArray
    ? value.map(function mapArrayValue(item, index) {
        return [String(index), item] as const;
      })
    : Object.entries(value);
  const openingToken = isArray ? "[" : "{";
  const closingToken = isArray ? "]" : "}";

  function handleExpandedChange() {
    setExpanded(function toggleExpanded(currentExpanded) {
      return !currentExpanded;
    });
  }

  return (
    <div className="flex flex-col [contain-intrinsic-size:auto_24px] [content-visibility:auto]">
      <div className="flex items-center gap-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={expanded ? collapseLabel : expandLabel}
          aria-expanded={expanded}
          onClick={handleExpandedChange}
        >
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
        {name === undefined ? null : (
          <Text as="span" family="mono" size="sm" tone="muted">
            {JSON.stringify(name)}:
          </Text>
        )}
        <Text as="span" family="mono" size="sm">
          {openingToken}
          {expanded || entries.length === 0 ? "" : ` … ${closingToken}`}
        </Text>
      </div>

      {expanded ? (
        <div className="flex flex-col border-l border-border/70 pl-5">
          {entries.map(function renderEntry([entryName, entryValue]) {
            return (
              <JsonTreeNode
                key={entryName}
                name={isArray ? undefined : entryName}
                value={entryValue}
                defaultExpanded={defaultExpanded}
                expandLabel={expandLabel}
                collapseLabel={collapseLabel}
              />
            );
          })}
          <Text as="span" family="mono" size="sm" className="py-0.5">
            {closingToken}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

function getPrimitiveClassName(value: JsonValue): string {
  if (value === null) {
    return "text-muted-foreground";
  }

  switch (typeof value) {
    case "string":
      return "text-json-string";
    case "number":
      return "text-json-number";
    case "boolean":
      return "text-json-boolean";
    default:
      return "text-foreground";
  }
}
