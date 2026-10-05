export type PdfCompressionMode = "balanced" | "lossless" | "smallest";

export type PdfOperationStage = "preparing" | "decoding" | "compressing" | "comparing";

export interface PdfToolLabels {
  closeSummary: string;
  copySummary: string;
  noText: string;
  summarize: string;
  summaryCopied: string;
  summaryTitle: string;
  balanced: string;
  chooseFile: string;
  compress: string;
  compressionMode: string;
  description: string;
  download: string;
  dropActive: string;
  dropPrompt: string;
  enterPassword: string;
  fileStaysLocal: string;
  incorrectPassword: string;
  loadingPreview: string;
  lossless: string;
  noSmallerResult: string;
  open: string;
  pages: string;
  password: string;
  passwordHelp: string;
  preview: string;
  processing: string;
  quality: string;
  removeLock: string;
  replaceFile: string;
  result: string;
  saved: string;
  smallest: string;
  supported: string;
  title: string;
  unlockComplete: string;
  unsupported: string;
}
