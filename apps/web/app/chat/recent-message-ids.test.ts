import { describe, expect, it } from "vitest";

import { RecentMessageIds } from "./recent-message-ids";

describe("recent message IDs", function () {
  it("evicts the oldest ID when the limit is reached", function () {
    const ids = new RecentMessageIds(2);
    ids.add("first");
    ids.add("second");
    ids.add("third");

    expect(ids.has("first")).toBe(false);
    expect(ids.has("second")).toBe(true);
    expect(ids.has("third")).toBe(true);
  });

  it("does not evict an ID when a duplicate is added", function () {
    const ids = new RecentMessageIds(2);
    ids.add("first");
    ids.add("second");
    ids.add("first");

    expect(ids.has("first")).toBe(true);
    expect(ids.has("second")).toBe(true);
  });
});
