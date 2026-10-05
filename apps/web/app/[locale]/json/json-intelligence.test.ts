import { afterEach, describe, expect, it, vi } from "vitest";

import { askAboutJson, generateJsonSchema } from "./json-intelligence";

function streamOf(chunks: string[]) {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function stubModel(session: object) {
  const destroy = vi.fn<() => void>();
  vi.stubGlobal("LanguageModel", {
    create: vi.fn<() => Promise<object>>().mockResolvedValue({ destroy, ...session }),
  });
  return destroy;
}

const context = { monitor: vi.fn<() => void>(), signal: new AbortController().signal };

afterEach(function restoreGlobals() {
  vi.unstubAllGlobals();
});

describe("askAboutJson", function () {
  it("streams the answer and cuts documents that would overflow the model", async function () {
    const promptStreaming = vi
      .fn<(input: string) => ReadableStream<string>>()
      .mockReturnValue(streamOf(["Three ", "items."]));
    const destroy = stubModel({ promptStreaming });
    const updates: string[] = [];

    const answer = await askAboutJson(
      JSON.stringify({ items: "x".repeat(20_000) }),
      "How many items?",
      "en",
      function recordUpdate(text) {
        updates.push(text);
      },
      context,
    );

    expect(answer).toBe("Three items.");
    expect(updates).toEqual(["Three ", "Three items."]);
    expect(promptStreaming.mock.calls[0]?.[0]).toContain("was cut for length");
    expect(destroy).toHaveBeenCalled();
  });
});

describe("generateJsonSchema", function () {
  it("returns the schema formatted for reading", async function () {
    stubModel({
      prompt: vi.fn<() => Promise<string>>().mockResolvedValue('{"type":"object"}'),
    });
    await expect(generateJsonSchema("{}", "en", context)).resolves.toBe('{\n  "type": "object"\n}');
  });
});
