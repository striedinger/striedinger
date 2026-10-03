import { describe, expect, it } from "vitest";

import { getDraggedRange } from "./chart-range";

describe("getDraggedRange", function () {
  it("selects the dragged portion regardless of drag direction", function () {
    expect(getDraggedRange({ start: 0, end: 99 }, 0.25, 0.75, 100)).toEqual({
      start: 25,
      end: 74,
    });
    expect(getDraggedRange({ start: 0, end: 99 }, 0.75, 0.25, 100)).toEqual({
      start: 25,
      end: 74,
    });
  });

  it("keeps a useful minimum range for short drags", function () {
    expect(getDraggedRange({ start: 0, end: 99 }, 0.5, 0.51, 100)).toEqual({
      start: 45,
      end: 56,
    });
  });
});
