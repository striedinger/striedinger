import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PdfToolLabels } from "./types";

import { PdfTool } from "./pdf-tool";

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  retry: "Try Again",
  working: "Working",
};

vi.mock("./pdf-preview", function mockPdfPreview() {
  return { PdfPreview: vi.fn<() => null>().mockReturnValue(null) };
});

// Each label reads as its own key, so assertions name the label they expect.
const labels = new Proxy(
  {},
  {
    get: function readLabel(_target, key) {
      return String(key);
    },
  },
) as PdfToolLabels;

describe("PdfTool", function () {
  afterEach(cleanup);

  it("opens the first PDF dropped on the screen and offers to compress it", function () {
    render(<PdfTool aiLabels={aiLabels} labels={labels} locale="en" />);
    expect(screen.getByRole("button", { name: "chooseFile" })).toBeTruthy();

    fireEvent.drop(window, {
      dataTransfer: {
        files: [
          new File(["text"], "notes.txt", { type: "text/plain" }),
          new File(["pdf"], "report.pdf", { type: "application/pdf" }),
        ],
        types: ["Files"],
      },
    });

    expect(screen.getByText("report.pdf")).toBeTruthy();
    const compressButton = screen.getByRole("button", { name: "compress" }) as HTMLButtonElement;
    expect(compressButton.disabled).toBe(false);
    expect(screen.getByRole("button", { name: "replaceFile" })).toBeTruthy();
  });

  it("asks for a quality only for the smallest file mode", function () {
    render(<PdfTool aiLabels={aiLabels} labels={labels} locale="en" />);
    fireEvent.drop(window, {
      dataTransfer: {
        files: [new File(["pdf"], "report.pdf", { type: "application/pdf" })],
        types: ["Files"],
      },
    });
    expect(screen.queryByRole("slider", { name: "quality" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "smallest" }));

    expect(screen.getByRole("slider", { name: "quality" })).toBeTruthy();
  });
});
