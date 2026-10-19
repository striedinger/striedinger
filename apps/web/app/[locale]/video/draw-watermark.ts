import type { WatermarkMotion, WatermarkSize } from "./types";

import { burnedInFontFamily } from "./draw-caption";
import {
  placeWatermark,
  positionWatermark,
  watermarkGapFraction,
  watermarkHeightFractions,
  watermarkTextFraction,
} from "./watermark-layout";

export interface WatermarkSettings {
  logo: ImageBitmap | null;
  motion: WatermarkMotion;
  opacity: number;
  size: WatermarkSize;
  text: string;
}

interface RenderedMark {
  frameHeight: number;
  frameWidth: number;
  height: number;
  image: OffscreenCanvas;
  /** Room around the mark for its shadow, so the shadow is not clipped. */
  padding: number;
  width: number;
}

/**
 * Draws watermarks onto frames. The logo and text are rendered into an image once per frame
 * size; each frame then costs one image draw at the moment's corner and opacity.
 */
export function createWatermarkPainter(settings: WatermarkSettings) {
  let mark: RenderedMark | null = null;

  return function paintWatermark(
    context: OffscreenCanvasRenderingContext2D,
    clipTime: number,
    frameWidth: number,
    frameHeight: number,
  ) {
    const { corner, visibility } = placeWatermark(clipTime, settings.motion);
    if (visibility <= 0) return;
    if (!mark || mark.frameWidth !== frameWidth || mark.frameHeight !== frameHeight) {
      mark = renderMark(settings, frameWidth, frameHeight);
    }
    if (!mark) return;
    const { x, y } = positionWatermark(
      corner,
      { height: frameHeight, width: frameWidth },
      { height: mark.height, width: mark.width },
    );
    context.globalAlpha = settings.opacity * visibility;
    context.drawImage(mark.image, x - mark.padding, y - mark.padding);
    context.globalAlpha = 1;
  };
}

function renderMark(
  settings: WatermarkSettings,
  frameWidth: number,
  frameHeight: number,
): RenderedMark | null {
  const height = Math.round(
    Math.min(frameWidth, frameHeight) * watermarkHeightFractions[settings.size],
  );
  const text = settings.text.trim();
  const font = `600 ${Math.round(height * watermarkTextFraction)}px ${burnedInFontFamily}`;
  const measuring = new OffscreenCanvas(1, 1).getContext("2d");
  if (!measuring) return null;
  measuring.font = font;
  const textWidth = text ? Math.ceil(measuring.measureText(text).width) : 0;
  const { logo } = settings;
  const logoWidth = logo ? Math.round((height * logo.width) / logo.height) : 0;
  const gap = logo && text ? Math.round(height * watermarkGapFraction) : 0;
  const width = logoWidth + gap + textWidth;
  if (width === 0) return null;

  const padding = Math.ceil(height * 0.25);
  const image = new OffscreenCanvas(width + padding * 2, height + padding * 2);
  const context = image.getContext("2d");
  if (!context) return null;
  // A soft shadow keeps white marks readable over bright footage, as the preview's does.
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = Math.max(2, height * 0.15);
  if (logo) context.drawImage(logo, padding, padding, logoWidth, height);
  if (text) {
    context.font = font;
    context.fillStyle = "#ffffff";
    context.textBaseline = "middle";
    context.fillText(text, padding + logoWidth + gap, padding + height / 2);
  }
  return { frameHeight, frameWidth, height, image, padding, width };
}
