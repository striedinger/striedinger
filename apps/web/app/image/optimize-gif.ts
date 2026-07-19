import type { ProgressCallback } from "./optimize-image";
import type { CompressionMode } from "./types";

interface OptimizeGifOptions {
  compressionMode: CompressionMode;
  maxDimension: number;
  quality: number;
}

export async function optimizeGif(
  file: File,
  options: OptimizeGifOptions,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(8, "preparing");
  const { default: gifsicle } = await import("gifsicle-wasm-browser");
  onProgress?.(30, "decoding");
  const lossless = options.compressionMode === "lossless";
  const lossy = lossless ? "" : `--lossy=${Math.max(1, Math.round((1 - options.quality) * 180))}`;
  const colors =
    options.compressionMode === "smallest"
      ? `--colors ${Math.max(48, Math.round(64 + options.quality * 128))}`
      : "";
  const resize =
    !lossless && options.maxDimension > 0
      ? `--resize-fit ${options.maxDimension}x${options.maxDimension}`
      : "";
  const output = await gifsicle.run({
    input: [{ file, name: "input.gif" }],
    command: [
      `-${lossless ? "O3" : "O2"} ${lossy} ${colors} ${resize} input.gif -o /out/output.gif`,
    ],
  });
  onProgress?.(92, "comparing");

  if (!output[0]) throw new Error("The GIF could not be optimized.");
  return new Blob([output[0]], { type: "image/gif" });
}
