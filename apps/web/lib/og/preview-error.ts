import type { PreviewErrorCode } from "./types";

export class PreviewError extends Error {
  readonly code: PreviewErrorCode;

  constructor(code: PreviewErrorCode) {
    super(code);
    this.code = code;
    this.name = "PreviewError";
  }
}
