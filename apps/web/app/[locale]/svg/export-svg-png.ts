const pngScale = 2;
const maximumPngSide = 4_096;
const fallbackSide = 300;

/**
 * Draws the SVG on a canvas at twice its size and encodes it as a PNG. The SVG loads as an
 * image, so its scripts never run and it cannot fetch anything.
 */
export async function exportSvgAsPng(
  source: string,
  width: number | null,
  height: number | null,
): Promise<Blob> {
  const image = new Image();
  image.src = createSvgDataUrl(source);
  await image.decode();
  const naturalWidth = width ?? (image.naturalWidth || fallbackSide);
  const naturalHeight = height ?? (image.naturalHeight || fallbackSide);
  const scale = Math.min(pngScale, maximumPngSide / Math.max(naturalWidth, naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>(function encodePng(resolve, reject) {
    canvas.toBlob(function receivePng(blob) {
      if (blob) resolve(blob);
      else reject(new Error("PNG encoding failed"));
    }, "image/png");
  });
}

export function createSvgDataUrl(source: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}
