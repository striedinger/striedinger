"use client";

import type { CSSProperties } from "react";

import type { PlayheadStore } from "./playhead-store";
import type { VideoWatermark } from "./types";

import { usePlayheadTime } from "./playhead-store";
import {
  placeWatermark,
  watermarkBottomFraction,
  watermarkGapFraction,
  watermarkHeightFractions,
  watermarkMarginFraction,
  watermarkTextFraction,
} from "./watermark-layout";

interface VideoWatermarkOverlayProps {
  playhead: PlayheadStore;
  /** Where the trimmed clip starts; the mark's movement is timed from there. */
  trimStart: number;
  watermark: VideoWatermark;
}

/**
 * The watermark over the preview, placed and sized by the same rules as the export. Sizes are
 * in container units of the preview frame, so it scales with the frame like the export does.
 */
export function VideoWatermarkOverlay({
  playhead,
  trimStart,
  watermark,
}: VideoWatermarkOverlayProps) {
  const { corner, visibility } = placeWatermark(
    usePlayheadTime(playhead) - trimStart,
    watermark.motion,
  );
  const height = watermarkHeightFractions[watermark.size] * 100;
  const margin = `${watermarkMarginFraction * 100}cqmin`;
  const text = watermark.text.trim();
  const style: CSSProperties = {
    fontSize: `${height * watermarkTextFraction}cqmin`,
    gap: `${height * watermarkGapFraction}cqmin`,
    height: `${height}cqmin`,
    opacity: watermark.opacity * visibility,
    ...(corner.startsWith("top")
      ? { top: margin }
      : { bottom: `${watermarkBottomFraction * 100}%` }),
    ...(corner.endsWith("left") ? { left: margin } : { right: margin }),
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute flex items-center leading-none font-semibold whitespace-nowrap text-white drop-shadow-md drop-shadow-black/45"
      style={style}
    >
      {watermark.logo ? (
        // The logo is a small PNG made from the person's own upload.
        // oxlint-disable-next-line nextjs/no-img-element
        <img src={watermark.logo.url} alt="" className="h-full w-auto" draggable={false} />
      ) : null}
      {text ? <span>{text}</span> : null}
    </div>
  );
}
