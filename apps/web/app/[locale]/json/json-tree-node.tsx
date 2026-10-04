"use client";

import { ChevronRightIcon } from "@workspace/icons/chevron-right-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
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
      <div className="flex min-w-0 items-start gap-2 pl-7">
        {name === undefined ? null : (
          <Text as="span" family="mono" className={cn(codeClassName, "shrink-0", keyClassName)}>
            {JSON.stringify(name)}:
          </Text>
        )}
        <Text
          as="span"
          family="mono"
          className={cn(codeClassName, "break-all", getPrimitiveClassName(value))}
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
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="text-ios-tertiary-label focus-visible:ring-ios-tint/50 active:bg-ios-fill flex size-6 shrink-0 items-center justify-center rounded-full outline-none select-none focus-visible:ring-2"
          aria-label={expanded ? collapseLabel : expandLabel}
          aria-expanded={expanded}
          onClick={handleExpandedChange}
        >
          <ChevronRightIcon
            className={cn(
              "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
              expanded && "rotate-90",
            )}
            strokeWidth={3}
          />
        </button>
        {name === undefined ? null : (
          <Text as="span" family="mono" className={cn(codeClassName, keyClassName)}>
            {JSON.stringify(name)}:
          </Text>
        )}
        <Text as="span" family="mono" className={cn(codeClassName, "text-ios-label")}>
          {openingToken}
          {expanded || entries.length === 0 ? "" : ` … ${closingToken}`}
        </Text>
      </div>

      {expanded ? (
        <div className="border-ios-separator ml-3 flex flex-col border-l pl-2">
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
          <Text as="span" family="mono" className={cn(codeClassName, "text-ios-label")}>
            {closingToken}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

const codeClassName = "text-[13px] leading-6";
const keyClassName = "text-ios-secondary-label";

function getPrimitiveClassName(value: JsonValue): string {
  if (value === null) {
    return "text-ios-tertiary-label";
  }

  switch (typeof value) {
    case "string":
      return "text-ios-green";
    case "number":
      return "text-ios-tint";
    case "boolean":
      return "text-ios-orange";
    default:
      return "text-ios-label";
  }
}
