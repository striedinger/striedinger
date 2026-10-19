import { describe, expect, it } from "vitest";

import { estimateExportBytes, listExportResolutions, resolveExportDimensions } from "./export-size";

describe("export size", function () {
  it("only offers resolutions smaller than the video", function () {
    expect(listExportResolutions(3840, 2160)).toEqual(["original", "1080", "720"]);
    expect(listExportResolutions(1080, 1920)).toEqual(["original", "720"]);
    expect(listExportResolutions(1280, 720)).toEqual(["original"]);
  });

  it("scales by the shorter edge and keeps dimensions even for encoders", function () {
    expect(resolveExportDimensions(3840, 2160, "1080")).toEqual({ height: 1080, width: 1920 });
    // A portrait phone video keeps its orientation.
    expect(resolveExportDimensions(1080, 1920, "720")).toEqual({ height: 1280, width: 720 });
    expect(resolveExportDimensions(1001, 563, "720")).toBeNull();
  });

  it("estimates a copied clip from its share of the file and a resized one from its bitrate", function () {
    const video = {
      audioBitrate: 128_000,
      duration: 60,
      fileSize: 120_000_000,
      frameRate: 30,
      hasAudio: true,
    };
    expect(estimateExportBytes({ ...video, clipDuration: 15, resolution: "original" })).toBe(
      30_000_000,
    );
    // 3 Mb/s of video and 128 kb/s of audio for 10 seconds.
    expect(estimateExportBytes({ ...video, clipDuration: 10, resolution: "720" })).toBe(3_910_000);
  });
});
