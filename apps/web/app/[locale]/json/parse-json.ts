import type { JsonParseResult, JsonValue } from "./types";

export function parseJson(value: string): JsonParseResult {
  if (!value.trim()) {
    return { status: "empty" };
  }

  try {
    return { status: "valid", value: JSON.parse(value) as JsonValue };
  } catch (error) {
    return {
      status: "invalid",
      error: error instanceof Error ? error.message : "",
    };
  }
}
