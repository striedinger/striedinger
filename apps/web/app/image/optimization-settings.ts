import type { CompressionMode } from "./types";

export function targetRatioForQuality(quality: number) {
  return Math.min(0.78, Math.max(0.38, 0.28 + quality * 0.0045));
}

export function targetRatioForMode(quality: number, compressionMode: CompressionMode) {
  const targetMultiplier = compressionMode === "smallest" ? 0.72 : 1;
  return targetRatioForQuality(quality) * targetMultiplier;
}
