import { describe, expect, it } from "vitest";

import { snapToKeyframe, stepKeyframe } from "./keyframes";

const keyframes = [0, 1, 2.5, 4];

describe("keyframe snapping", function () {
  it("snaps to the nearest keyframe the clip can still start at", function () {
    expect(snapToKeyframe(keyframes, 2.2, 10)).toBe(2.5);
    expect(snapToKeyframe(keyframes, 1.6, 10)).toBe(1);
    // A keyframe past the end handle would leave no clip, so the nearest earlier one wins.
    expect(snapToKeyframe(keyframes, 3.9, 3)).toBe(2.5);
  });

  it("steps between keyframes without passing the end handle", function () {
    expect(stepKeyframe(keyframes, 1, 1, 10)).toBe(2.5);
    expect(stepKeyframe(keyframes, 1, -1, 10)).toBe(0);
    expect(stepKeyframe(keyframes, 2.5, 1, 3)).toBe(2.5);
    expect(stepKeyframe(keyframes, 0, -1, 10)).toBe(0);
  });
});
