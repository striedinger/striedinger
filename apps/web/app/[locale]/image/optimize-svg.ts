import type { ProgressCallback } from "./optimize-image";
import type { CompressionMode } from "./types";

import { optimizeSvgText } from "../../../lib/svg/optimize-svg-text";

export async function optimizeSvg(
  file: File,
  compressionMode: CompressionMode,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(12, "preparing");
  const source = await file.text();
  onProgress?.(58, "compressing");
  const data = await optimizeSvgText(source, { keepDimensions: compressionMode === "lossless" });
  onProgress?.(94, "comparing");
  return new Blob([data], { type: "image/svg+xml" });
}
