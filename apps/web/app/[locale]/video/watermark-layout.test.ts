import { describe, expect, it } from "vitest";

import { placeWatermark, positionWatermark, watermarkHopSeconds } from "./watermark-layout";

describe("watermark placement", function () {
  it("hops between corners, starting fully visible", function () {
    expect(placeWatermark(0, "hop")).toEqual({ corner: "top-left", visibility: 1 });
    expect(placeWatermark(watermarkHopSeconds + 1, "hop").corner).toBe("bottom-right");
    expect(placeWatermark(watermarkHopSeconds * 4 + 1, "hop").corner).toBe("top-left");
  });

  it("fades out before a hop and back in after it", function () {
    expect(placeWatermark(watermarkHopSeconds - 0.15, "hop").visibility).toBeCloseTo(0.5);
    expect(placeWatermark(watermarkHopSeconds, "hop").visibility).toBe(0);
    expect(placeWatermark(watermarkHopSeconds + 0.15, "hop").visibility).toBeCloseTo(0.5);
  });

  it("stays put when fixed", function () {
    expect(placeWatermark(watermarkHopSeconds * 3 + 0.1, "fixed")).toEqual({
      corner: "bottom-right",
      visibility: 1,
    });
  });

  it("keeps bottom corners clear of the caption band", function () {
    const frame = { height: 1920, width: 1080 };
    const mark = { height: 76, width: 300 };
    expect(positionWatermark("top-left", frame, mark)).toEqual({ x: 43.2, y: 43.2 });
    const bottomRight = positionWatermark("bottom-right", frame, mark);
    expect(bottomRight.x).toBeCloseTo(1080 - 43.2 - 300);
    expect(bottomRight.y + mark.height).toBeLessThan(frame.height * 0.85);
  });
});
