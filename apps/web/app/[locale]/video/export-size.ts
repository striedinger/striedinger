/** The resolutions a video can be exported at, named by their shorter edge. */
export type ExportResolution = "original" | "1080" | "720";

const shortEdges = { "1080": 1080, "720": 720 } as const;

/**
 * Bitrates for resized exports at 30 frames per second, chosen for sharing: clearly sharp on a
 * phone, a fraction of what cameras record. They are fixed so the size estimate holds.
 */
const bitratesAt30Fps = { "1080": 6_000_000, "720": 3_000_000 } as const;

/** Audio bitrate assumed when the file does not say. */
const fallbackAudioBitrate = 128_000;

/** The resolutions worth offering: the original, plus each one smaller than it. */
export function listExportResolutions(width: number, height: number): ExportResolution[] {
  const shortEdge = Math.min(width, height);
  return [
    "original",
    ...(["1080", "720"] as const).filter(function isSmaller(resolution) {
      return shortEdges[resolution] < shortEdge;
    }),
  ];
}

/** The output dimensions for a resolution, kept even for encoders, or `null` to keep the size. */
export function resolveExportDimensions(
  width: number,
  height: number,
  resolution: ExportResolution,
) {
  if (resolution === "original") return null;
  const scale = shortEdges[resolution] / Math.min(width, height);
  if (scale >= 1) return null;
  return { height: toEven(height * scale), width: toEven(width * scale) };
}

/** The video bitrate for a resized export, raised for high frame rates. */
export function resolveExportBitrate(
  resolution: Exclude<ExportResolution, "original">,
  frameRate: number | null,
) {
  const frameRateFactor = frameRate !== null && frameRate > 40 ? 1.5 : 1;
  return Math.round(bitratesAt30Fps[resolution] * frameRateFactor);
}

interface ExportEstimateInput {
  audioBitrate: number | null;
  clipDuration: number;
  duration: number;
  fileSize: number;
  frameRate: number | null;
  hasAudio: boolean;
  resolution: ExportResolution;
}

/** The approximate size of the export in bytes. */
export function estimateExportBytes({
  audioBitrate,
  clipDuration,
  duration,
  fileSize,
  frameRate,
  hasAudio,
  resolution,
}: ExportEstimateInput) {
  if (resolution === "original" || duration <= 0) {
    // Copied or re-encoded at high quality, the clip keeps roughly the original's bitrate.
    return duration > 0 ? (fileSize * clipDuration) / duration : fileSize;
  }
  const audio = hasAudio ? (audioBitrate ?? fallbackAudioBitrate) : 0;
  return ((resolveExportBitrate(resolution, frameRate) + audio) * clipDuration) / 8;
}

function toEven(value: number) {
  return Math.max(2, Math.round(value / 2) * 2);
}
