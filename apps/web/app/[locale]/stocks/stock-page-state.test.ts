import { describe, expect, it } from "vitest";

import { getStockPageState } from "./stock-page-state";

describe("getStockPageState", function () {
  it("restores a normalized shareable stock selection", function () {
    expect(getStockPageState({ symbol: "spcx", timeframe: "1y" })).toEqual({
      query: "",
      symbol: "SPCX",
      timeframe: "1Y",
    });
  });

  it("falls back safely for malformed URL state", function () {
    expect(getStockPageState({ symbol: "<script>", timeframe: "forever" })).toEqual({
      query: "",
      symbol: null,
      timeframe: "1M",
    });
  });
});
