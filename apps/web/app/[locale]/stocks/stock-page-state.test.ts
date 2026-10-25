import { describe, expect, it } from "vitest";

import { getStockPageState } from "./stock-page-state";

describe("getStockPageState", function () {
  it("restores a normalized shareable stock selection", function () {
    expect(getStockPageState({ symbol: "spcx", timeframe: "1y" })).toEqual({
      list: null,
      query: "",
      symbol: "SPCX",
      timeframe: "1Y",
    });
  });

  it("falls back safely for malformed URL state", function () {
    expect(getStockPageState({ symbol: "<script>", timeframe: "forever" })).toEqual({
      list: null,
      query: "",
      symbol: null,
      timeframe: "1D",
    });
  });

  it("reads the mirrored watchlist, keeping an intentionally empty one", function () {
    expect(getStockPageState({ list: "aapl, tsla,<b>,AAPL" }).list).toEqual(["AAPL", "TSLA"]);
    expect(getStockPageState({ list: "" }).list).toEqual([]);
  });
});
