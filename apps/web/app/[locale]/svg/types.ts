export interface SvgEditorLabels {
  aiClose: string;
  aiDescribe: string;
  aiPlaceholder: string;
  aiSubmit: string;
  aiTitle: string;
  aiUndo: string;
  background: string;
  copied: string;
  copy: string;
  darkBackground: string;
  details: string;
  description: string;
  dimensions: string;
  downloadSvg: string;
  elements: string;
  emptyPreview: string;
  exportFailed: string;
  exportPng: string;
  fileSize: string;
  gridBackground: string;
  inputLabel: string;
  invalid: string;
  lightBackground: string;
  notSvg: string;
  open: string;
  openFailed: string;
  optimize: string;
  optimizeFailed: string;
  optimized: string;
  alreadyOptimized: string;
  placeholder: string;
  preview: string;
  privacy: string;
  share: string;
  actions: string;
  title: string;
  tooLarge: string;
  valid: string;
}

export type SvgPreviewBackground = "grid" | "light" | "dark";

export type SvgInspection =
  | { status: "empty" }
  | { status: "invalid"; error: string; reason: "syntax" | "not-svg" | "too-large" }
  | {
      status: "valid";
      byteLength: number;
      elementCount: number;
      height: number | null;
      width: number | null;
    };
