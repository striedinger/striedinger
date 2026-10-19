import type { WatermarkMotion, WatermarkSize } from "./types";

/**
 * Where a watermark sits and how visible it is at a moment of the clip. The preview and the
 * export both place it from these functions, so what plays is what gets burned in.
 */

export type WatermarkCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Each stop is the corner diagonally or sideways from the last, so it is hard to crop out. */
const hopOrder: readonly WatermarkCorner[] = [
  "top-left",
  "bottom-right",
  "top-right",
  "bottom-left",
];
export const watermarkHopSeconds = 4;
const fadeSeconds = 0.3;

/** The mark's height as a fraction of the frame's shorter edge. */
export const watermarkHeightFractions: Record<WatermarkSize, number> = {
  large: 0.1,
  medium: 0.07,
  small: 0.05,
};
/** The gap from the frame's sides and top, as a fraction of its shorter edge. */
export const watermarkMarginFraction = 0.04;
/** Bottom corners sit this fraction of the height up, clear of captions. */
export const watermarkBottomFraction = 0.16;
/** Text size and the logo-to-text gap, as fractions of the mark's height. */
export const watermarkTextFraction = 0.62;
export const watermarkGapFraction = 0.25;

/** The corner at a time from the clip's start, and a 0 to 1 visibility for fading between hops. */
export function placeWatermark(clipTime: number, motion: WatermarkMotion) {
  if (motion === "fixed") return { corner: "bottom-right" as WatermarkCorner, visibility: 1 };
  const time = Math.max(0, clipTime);
  const stop = Math.floor(time / watermarkHopSeconds);
  const intoStop = time - stop * watermarkHopSeconds;
  // The first stop is fully visible from the first frame; later ones fade in.
  const fadeIn = stop === 0 ? 1 : intoStop / fadeSeconds;
  const fadeOut = (watermarkHopSeconds - intoStop) / fadeSeconds;
  return {
    corner: hopOrder[stop % hopOrder.length] ?? "top-left",
    visibility: Math.max(0, Math.min(1, fadeIn, fadeOut)),
  };
}

/** The mark's top-left position in a frame, in pixels. */
export function positionWatermark(
  corner: WatermarkCorner,
  frame: { height: number; width: number },
  mark: { height: number; width: number },
) {
  const margin = Math.min(frame.width, frame.height) * watermarkMarginFraction;
  const isLeft = corner.endsWith("left");
  const isTop = corner.startsWith("top");
  return {
    x: isLeft ? margin : frame.width - margin - mark.width,
    y: isTop ? margin : frame.height * (1 - watermarkBottomFraction) - mark.height,
  };
}
