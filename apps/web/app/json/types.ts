export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonToolLabels {
  collapseAll: string;
  collapseValue: string;
  description: string;
  emptyPreview: string;
  expandAll: string;
  expandValue: string;
  inputLabel: string;
  invalid: string;
  placeholder: string;
  preview: string;
  privacy: string;
  title: string;
  valid: string;
  tooLarge: string;
  tooComplex: string;
}

export type JsonParseResult =
  | { status: "empty" }
  | { status: "invalid"; error: string; reason?: "syntax" | "too-large" }
  | { status: "valid"; value: JsonValue; previewable?: boolean };
