import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "../../lib/copy-text";

afterEach(function restoreMocks() {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("copyText", function () {
  it("uses the clipboard API when it is available", async function () {
    const writeText = vi.fn<(text: string) => Promise<void>>(function writeText() {
      return Promise.resolve();
    });
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await copyText("invite-link")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("invite-link");
  });

  it("falls back to a selected textarea when clipboard permission is denied", async function () {
    const writeText = vi.fn<(text: string) => Promise<void>>(function writeText() {
      return Promise.reject(new Error("denied"));
    });
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn<(command: string) => boolean>(function execCommand() {
      return true;
    });
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    const copyButton = document.createElement("button");
    document.body.append(copyButton);
    copyButton.focus();

    expect(await copyText("invite-link")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    copyButton.remove();
  });
});
