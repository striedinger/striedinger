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

  return {
    formattedInput: JSON.stringify(result.value, null, 2),
    result: { ...result, previewable: canPreviewJson(result.value) },
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

    for (const childValue of childValues) {
      pendingValues.push({ depth: childDepth, value: childValue });
    }
  }

  return true;
}
