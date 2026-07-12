import type { PreviewErrorCode } from "./types";

export class PreviewError extends Error {
  constructor(public readonly code: PreviewErrorCode) {
    super(code);
    this.name = "PreviewError";
  }
}
