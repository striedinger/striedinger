import { describe, expect, it } from "vitest";

import type { ChatMessage } from "./types";

import { createMessageKey, decryptMessage, encryptMessage } from "./message-crypto";

describe("nearby message encryption", function () {
  it("encrypts and authenticates a chat message", async function () {
    const { key } = await createMessageKey();
    const message = {
      author: "Quiet Otter",
      id: crypto.randomUUID(),
      sentAt: 1_721_000_000_000,
      text: "hello nearby",
    };

    const encrypted = await encryptMessage(key, message);

    expect(encrypted).not.toContain(message.text);
    await expect(decryptMessage(key, encrypted)).resolves.toEqual(message);
  });

  it("rejects a message encrypted for another connection", async function () {
    const first = await createMessageKey();
    const second = await createMessageKey();
    const encrypted = await encryptMessage(first.key, {
      author: "Silver Finch",
      id: crypto.randomUUID(),
      sentAt: Date.now(),
      text: "private",
    });

    await expect(decryptMessage(second.key, encrypted)).rejects.toBeInstanceOf(Error);
  });

  it("rejects timestamps that cannot be rendered as dates", async function () {
    const { key } = await createMessageKey();
    const encrypted = await encryptMessage(key, {
      author: "Quiet Otter",
      id: crypto.randomUUID(),
      sentAt: 1e100,
      text: "malformed timestamp",
    });

    await expect(decryptMessage(key, encrypted)).rejects.toThrow("Invalid chat message");
  });

  it("strips untrusted properties from decrypted messages", async function () {
    const { key } = await createMessageKey();
    const message: ChatMessage & { isOwn: boolean } = {
      author: "Quiet Otter",
      id: crypto.randomUUID(),
      isOwn: true,
      sentAt: Date.now(),
      text: "remote message",
    };
    const encrypted = await encryptMessage(key, message);

    await expect(decryptMessage(key, encrypted)).resolves.not.toHaveProperty("isOwn");
  });
});
