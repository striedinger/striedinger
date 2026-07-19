import type { ProgressCallback } from "./optimize-image";
import type { CompressionMode } from "./types";

export async function optimizeSvg(
  file: File,
  compressionMode: CompressionMode,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(12, "preparing");
  const [{ optimize }, source] = await Promise.all([import("svgo/browser"), file.text()]);
  onProgress?.(58, "compressing");
  const result = optimize(source, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupNumericValues: { floatPrecision: 3 },
            convertPathData: { floatPrecision: 3 },
          },
        },
      },
      ...(compressionMode === "lossless" ? [] : ["removeDimensions" as const]),
    ],
  });
  onProgress?.(94, "comparing");
  return new Blob([result.data], { type: "image/svg+xml" });
}
