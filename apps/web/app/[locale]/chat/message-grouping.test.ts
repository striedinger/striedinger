import { describe, expect, it } from "vitest";

import type { VisibleChatMessage } from "./types";

import { getMessagePlacement } from "./message-grouping";

function createMessage(
  id: string,
  author: string,
  sentAt: number,
  isOwn = false,
): VisibleChatMessage {
  return { author, id, isOwn, sentAt, text: id };
}

describe("message grouping", function () {
  it("joins consecutive messages from the same sender", function () {
    const messages = [
      createMessage("first", "Quiet Otter", 0),
      createMessage("second", "Quiet Otter", 30_000),
      createMessage("reply", "Silver Finch", 60_000, true),
    ];

    expect(getMessagePlacement(messages, 0)).toEqual({
      continuesGroup: false,
      continuesIntoNext: true,
      showsTimestamp: true,
    });
    expect(getMessagePlacement(messages, 1)).toEqual({
      continuesGroup: true,
      continuesIntoNext: false,
      showsTimestamp: false,
    });
    expect(getMessagePlacement(messages, 2).continuesGroup).toBe(false);
  });

  it("starts a new timestamped group after a long pause", function () {
    const messages = [
      createMessage("before", "Quiet Otter", 0),
      createMessage("after", "Quiet Otter", 16 * 60 * 1_000),
    ];

    expect(getMessagePlacement(messages, 0).continuesIntoNext).toBe(false);
    expect(getMessagePlacement(messages, 1)).toEqual({
      continuesGroup: false,
      continuesIntoNext: false,
      showsTimestamp: true,
    });
  });
});
