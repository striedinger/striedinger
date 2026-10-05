export type OutputFormat = "auto" | "image/avif" | "image/jpeg" | "image/png" | "image/webp";

export type CompressionMode = "balanced" | "lossless" | "smallest";

type OptimizationStatus = "queued" | "optimizing" | "done" | "error";

export type OptimizationStage = "preparing" | "decoding" | "compressing" | "comparing";

export interface OptimizerItem {
  error?: string;
  file: File;
  id: string;
  output?: Blob;
  outputName?: string;
  progress?: number;
  stage?: OptimizationStage;
  status: OptimizationStatus;
}

export interface ImageOptimizerLabels {
  closeDescription: string;
  copiedAltText: string;
  copyAltText: string;
  describe: string;
  describeTitle: string;
  renamed: string;
  renameTo: string;
  noTextInImage: string;
  textInImage: string;
  translateText: string;
  addMore: string;
  avif: string;
  autoFormat: string;
  autoTarget: string;
  balanced: string;
  balancedMode: string;
  chooseFiles: string;
  clearAll: string;
  comparing: string;
  compressing: string;
  compressionMode: string;
  decoding: string;
  description: string;
  dimensionHint: string;
  download: string;
  downloadAll: string;
  dropActive: string;
  dropPrompt: string;
  error: string;
  format: string;
  jpeg: string;
  losslessMode: string;
  maxDimension: string;
  originalDimensions: string;
  preparing: string;
  png: string;
  privacy: string;
  quality: string;
  qualityHint: string;
  queue: string;
  remove: string;
  saved: string;
  smallerFilesKept: string;
  smallestMode: string;
  supported: string;
  title: string;
  tooManyFiles: string;
  unsupported: string;
  webp: string;
}
