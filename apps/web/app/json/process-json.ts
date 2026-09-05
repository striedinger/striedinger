import type { JsonParseResult, JsonValue } from "./types";

import { parseJson } from "./parse-json";

const maximumPreviewNodes = 10_000;
const maximumPreviewDepth = 100;

export interface JsonWorkerResponse {
  formattedInput?: string;
  result: JsonParseResult;
}

export function processJson(input: string): JsonWorkerResponse {
  const result = parseJson(input);

  if (result.status !== "valid") return { result };

  const previewable = canPreviewJson(result.value);
  // Bound traversal before stringify: deeply nested valid JSON can overflow its stack.
  // Do not structured-clone an unrenderable tree back to the main thread either.
  if (!previewable) return { result: { status: "valid", value: null, previewable } };
  const formattedInput = JSON.stringify(result.value, null, 2);

  return {
    formattedInput: formattedInput.length <= 500_000 ? formattedInput : undefined,
    result: { ...result, previewable },
  };
}

function canPreviewJson(value: JsonValue): boolean {
  const pendingValues: Array<{ depth: number; value: JsonValue }> = [{ depth: 0, value }];
  let nodeCount = 0;

  while (pendingValues.length > 0) {
    const currentNode = pendingValues.pop()!;
    nodeCount += 1;

    if (nodeCount > maximumPreviewNodes || currentNode.depth > maximumPreviewDepth) return false;

    const childDepth = currentNode.depth + 1;
    const childValues = Array.isArray(currentNode.value)
      ? currentNode.value
      : typeof currentNode.value === "object" && currentNode.value !== null
        ? Object.values(currentNode.value)
        : [];

    if (nodeCount + pendingValues.length + childValues.length > maximumPreviewNodes) return false;

    for (const childValue of childValues) {
      pendingValues.push({ depth: childDepth, value: childValue });
    }
  }

  return true;
}
