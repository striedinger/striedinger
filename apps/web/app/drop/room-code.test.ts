import { describe, expect, it, vi } from "vitest";

import { createRoomCode, deriveRoomId, formatRoomCode, parseRoomCode } from "./room-code";

describe("room codes", function () {
  it("creates a readable code with enough random characters", function () {
    vi.spyOn(crypto, "getRandomValues").mockImplementation(function fillWithZeros(array) {
      return array;
    });

    const roomCode = createRoomCode();

    expect(roomCode).toBe("2".repeat(16));
    expect(formatRoomCode(roomCode)).toBe("2222-2222-2222-2222");
  });

  it("normalizes valid manually entered codes", function () {
    expect(parseRoomCode("abcd-efgh-jkmn-pqrs")).toBe("ABCDEFGHJKMNPQRS");
    expect(parseRoomCode("too-short")).toBeUndefined();
    expect(parseRoomCode("IIII-IIII-IIII-IIII")).toBeUndefined();
  });

  it("derives a stable, non-reversible discovery identifier", async function () {
    const roomId = await deriveRoomId("ABCDEFGHJKMNPQRS");

    expect(roomId).toHaveLength(64);
    expect(roomId).toBe(await deriveRoomId("ABCDEFGHJKMNPQRS"));
    expect(roomId).not.toContain("ABCDEFGH");
  });
});
