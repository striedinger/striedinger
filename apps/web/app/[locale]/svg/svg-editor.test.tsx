import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SvgEditorLabels } from "./types";

import { SvgEditor } from "./svg-editor";

const optimizeSvgText = vi.hoisted(function createOptimizerMock() {
  return vi.fn<(source: string) => Promise<string>>();
});

vi.mock("../../../lib/svg/optimize-svg-text", function mockOptimizer() {
  return { optimizeSvgText };
});

const labels: SvgEditorLabels = {
  actions: "SVG actions",
  alreadyOptimized: "Already optimized",
  background: "Background",
  copied: "Copied",
  copy: "Copy",
  darkBackground: "Dark",
  description: "Description",
  dimensions: "Dimensions",
  downloadSvg: "Download SVG",
  elements: "Elements",
  emptyPreview: "Empty preview",
  exportFailed: "Export failed",
  exportPng: "Export PNG",
  fileSize: "File size",
  gridBackground: "Grid",
  inputLabel: "SVG code",
  invalid: "Invalid SVG: {error}",
  lightBackground: "Light",
  notSvg: "Not an SVG",
  open: "Open",
  openFailed: "Open failed",
  optimize: "Optimize",
  optimized: "Optimized from {before} to {after}.",
  optimizeFailed: "Optimize failed",
  placeholder: "Paste SVG code here",
  preview: "Preview",
  privacy: "Private",
  title: "SVG Editor",
  tooLarge: "Too large",
  valid: "Valid SVG",
};

const square =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';

function getCode() {
  return screen.getByRole("textbox", { name: labels.inputLabel });
}

describe("SvgEditor", function () {
  it("keeps the last valid drawing on screen while the markup is broken", function () {
    render(<SvgEditor labels={labels} locale="en-US" />);
    fireEvent.change(getCode(), { target: { value: square } });
    expect(screen.getByText(labels.valid)).toBeInTheDocument();
    expect(screen.getByText("10 × 10")).toBeInTheDocument();
    const previewSource = screen.getByRole("img", { name: labels.preview }).getAttribute("src");

    fireEvent.change(getCode(), { target: { value: "<svg" } });

    expect(screen.getByText(/^Invalid SVG:/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: labels.preview })).toHaveAttribute("src", previewSource);
    expect(screen.getByRole("button", { name: labels.downloadSvg })).toBeDisabled();
  });

  it("replaces the code with the optimized markup and reports the savings", async function () {
    optimizeSvgText.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"/>');
    render(<SvgEditor labels={labels} locale="en-US" />);

    await act(async function optimize() {
      fireEvent.click(screen.getByRole("button", { name: labels.optimize }));
    });

    expect(getCode()).toHaveValue('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(screen.getByText(/^Optimized from .* to 41 B\.$/)).toBeInTheDocument();
  });

  it("opens an SVG file into the editor", async function () {
    render(<SvgEditor labels={labels} locale="en-US" />);
    const file = new File([square], "square.svg", { type: "image/svg+xml" });

    await act(async function openFile() {
      fireEvent.change(screen.getByLabelText(labels.open), { target: { files: [file] } });
    });

    expect(getCode()).toHaveValue(square);
  });
});
