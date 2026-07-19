import { describe, expect, it } from "vitest";

import { getStockPageState } from "./stock-page-state";

describe("getStockPageState", function () {
  it("restores a normalized shareable stock selection", function () {
    expect(getStockPageState({ symbol: "spcx", timeframe: "1y" })).toEqual({
      symbol: "SPCX",
      timeframe: "1Y",
    });
  });

  it("falls back safely for malformed URL state", function () {
    expect(getStockPageState({ symbol: "<script>", timeframe: "forever" })).toEqual({
      symbol: null,
      timeframe: "1M",
    });
  });
});
