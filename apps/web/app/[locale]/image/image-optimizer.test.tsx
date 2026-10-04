import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ImageOptimizerLabels } from "./types";

import { ImageOptimizer } from "./image-optimizer";

vi.mock("./optimize-image", function mockOptimizeImage() {
  return {
    optimizeImage: vi.fn<() => Promise<Blob>>(function optimizeImage() {
      return new Promise(function pending() {});
    }),
  };
});

// Each label reads as its own key, so assertions name the label they expect.
const labels = new Proxy(
  {},
  {
    get: function readLabel(_target, key) {
      return String(key);
    },
  },
) as ImageOptimizerLabels;

function dropFiles(files: File[]) {
  fireEvent.drop(window, { dataTransfer: { files, types: ["Files"] } });
}

describe("ImageOptimizer", function () {
  afterEach(cleanup);

  it("queues images dropped anywhere on the screen", function () {
    render(<ImageOptimizer labels={labels} />);

    dropFiles([new File(["png"], "photo.png", { type: "image/png" })]);

    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(screen.getByText("addMore")).toBeTruthy();
  });

  it("explains when dropped files are not images", function () {
    render(<ImageOptimizer labels={labels} />);

    dropFiles([new File(["text"], "notes.txt", { type: "text/plain" })]);

    expect(screen.getByRole("alert").textContent).toBe("unsupported");
    expect(screen.queryByText("notes.txt")).toBeNull();
  });

  it("returns to the empty drop target after removing the last image", function () {
    render(<ImageOptimizer labels={labels} />);
    dropFiles([new File(["png"], "photo.png", { type: "image/png" })]);

    fireEvent.click(screen.getByRole("button", { name: "remove photo.png" }));

    expect(screen.getByText("dropPrompt")).toBeTruthy();
    expect(screen.queryByText("photo.png")).toBeNull();
  });

  it("keeps original dimensions and offers no JPEG output in lossless mode", function () {
    render(<ImageOptimizer labels={labels} />);
    expect(screen.getByRole("button", { name: "jpeg" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "losslessMode" }));

    expect(screen.queryByRole("button", { name: "jpeg" })).toBeNull();
    const originalDimensions = screen.getByRole("button", { name: "originalDimensions" });
    expect(originalDimensions.getAttribute("aria-pressed")).toBe("true");
    expect((originalDimensions as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("slider", { name: "quality" })).toBeNull();
  });
});
