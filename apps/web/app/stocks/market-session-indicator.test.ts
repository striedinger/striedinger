import { describe, expect, it } from "vitest";

import { getUnitedStatesMarketSession } from "./market-session-indicator";

describe("getUnitedStatesMarketSession", function () {
  it("identifies each extended and regular trading session in New York time", function () {
    expect(getUnitedStatesMarketSession(new Date("2026-07-17T12:00:00Z"))).toBe("pre-market");
    expect(getUnitedStatesMarketSession(new Date("2026-07-17T14:00:00Z"))).toBe("open");
    expect(getUnitedStatesMarketSession(new Date("2026-07-17T21:00:00Z"))).toBe("after-hours");
    expect(getUnitedStatesMarketSession(new Date("2026-07-18T01:00:00Z"))).toBe("closed");
  });

  it("keeps the market closed on weekends", function () {
    expect(getUnitedStatesMarketSession(new Date("2026-07-18T16:00:00Z"))).toBe("closed");
  });
});
