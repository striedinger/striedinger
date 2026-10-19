import type { WatermarkLogo } from "./types";

export const watermarkLogoTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const maximumLogoBytes = 5 * 1024 * 1024;
/** Larger images are refused before they are drawn, so a crafted file cannot exhaust memory. */
const maximumSourceEdge = 4096;
/** A watermark is at most a tenth of the frame, so 512 pixels stays sharp even on 4K. */
const storedLogoEdge = 512;

/**
 * Checks an uploaded logo and redraws it as a PNG of at most 512 pixels. Redrawing strips
 * metadata and leaves nothing of an SVG but its pixels; images render without scripts or
 * network access. Returns `null` for anything that is not a usable image within the limits.
 */
export async function loadWatermarkLogo(file: File): Promise<WatermarkLogo | null> {
  if (!watermarkLogoTypes.includes(file.type) || file.size > maximumLogoBytes) return null;
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const { naturalHeight, naturalWidth } = image;
    if (!naturalWidth || !naturalHeight) return null;
    if (naturalWidth > maximumSourceEdge || naturalHeight > maximumSourceEdge) return null;
    const scale = Math.min(1, storedLogoEdge / Math.max(naturalWidth, naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(function encodePng(resolve) {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) return null;
    return { blob, height: canvas.height, url: URL.createObjectURL(blob), width: canvas.width };
  } catch {
    // Undecodable files, and SVGs the browser refuses to export from a canvas, end up here.
    return null;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
