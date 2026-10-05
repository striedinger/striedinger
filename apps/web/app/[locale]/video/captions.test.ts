import { describe, expect, it } from "vitest";

import {
  captionsToWebVtt,
  createCaptionAt,
  findCaptionAt,
  formatClock,
  splitLongCaption,
} from "./captions";

const captions = [
  { end: 4, id: "b", start: 2, text: "Second" },
  { end: 1.5, id: "a", start: 0.5, text: "First" },
];

describe("captions", function () {
  it("finds the caption showing at a moment", function () {
    expect(findCaptionAt(captions, 3)?.id).toBe("b");
    expect(findCaptionAt(captions, 1.75)).toBeUndefined();
  });

  it("ends new captions before the next one starts", function () {
    const caption = createCaptionAt(captions, 1.6, 10);
    expect(caption.start).toBe(1.6);
    expect(caption.end).toBe(2);
  });

  it("writes WebVTT timed from the trim start, keeping only captions inside it", function () {
    expect(captionsToWebVtt(captions, { start: 1, end: 3 })).toBe(
      "WEBVTT\n\n00:00:00.000 --> 00:00:00.500\nFirst\n\n00:00:01.000 --> 00:00:02.000\nSecond\n",
    );
  });

  it("formats clock times to tenths of a second", function () {
    expect(formatClock(65.27)).toBe("1:05.2");
    expect(formatClock(3)).toBe("0:03.0");
  });

  it("splits long captions at clause breaks, sharing the time by length", function () {
    const pieces = splitLongCaption({
      end: 11,
      id: "jfk",
      start: 0,
      text: "And so my fellow Americans, ask not what your country can do for you, ask what you can do for your country.",
    });
    expect(
      pieces.map(function selectText(piece) {
        return piece.text;
      }),
    ).toEqual([
      "And so my fellow Americans, ask not what your country can do for you,",
      "ask what you can do for your country.",
    ]);
    expect(pieces[0]?.start).toBe(0);
    expect(pieces.at(-1)?.end).toBe(11);
    expect(pieces[1]?.start).toBeCloseTo(pieces[0]?.end ?? 0);
  });
});
