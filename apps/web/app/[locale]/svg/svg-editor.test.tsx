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

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  retry: "Try Again",
  working: "Working",
};

const labels: SvgEditorLabels = {
  aiClose: "Close",
  aiDescribe: "Add Title and Description",
  aiPlaceholder: "Describe a change",
  aiSubmit: "Apply Change",
  aiTitle: "Edit with On-Device AI",
  aiTooLarge: "Too large for AI",
  aiUndo: "Undo",
  actions: "SVG actions",
  alreadyOptimized: "Already optimized",
  background: "Background",
  copied: "Copied",
  copy: "Copy",
  darkBackground: "Dark",
  description: "Description",
  details: "Details",
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
  share: "Share",
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
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="en-US" />);
    fireEvent.change(getCode(), { target: { value: square } });
    expect(screen.getByText(labels.valid)).toBeInTheDocument();
    expect(screen.getByText("10 × 10")).toBeInTheDocument();
    const previewSource = screen.getByRole("img", { name: labels.preview }).getAttribute("src");

    fireEvent.change(getCode(), { target: { value: "<svg" } });

    expect(screen.getByText(/^Invalid SVG:/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: labels.preview })).toHaveAttribute("src", previewSource);
    expect(screen.getByRole("button", { name: labels.optimize })).toBeDisabled();
  });

  it("replaces the code with the optimized markup and reports the savings", async function () {
    optimizeSvgText.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"/>');
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="en-US" />);

    await act(async function optimize() {
      fireEvent.click(screen.getByRole("button", { name: labels.optimize }));
    });

    expect(getCode()).toHaveValue('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(screen.getByText(/^Optimized from .* to 41 B\.$/)).toBeInTheDocument();
  });

  it("shows no AI controls in browsers without on-device AI", function () {
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="en-US" />);
    expect(screen.queryByRole("button", { name: labels.aiTitle })).not.toBeInTheDocument();
  });

  it("applies a plain-language change with the on-device model and can undo it", async function () {
    const prompt = vi
      .fn<(input: unknown) => Promise<string>>()
      .mockResolvedValue(JSON.stringify({ svg: square }));
    vi.stubGlobal("LanguageModel", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("available"),
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue({ destroy() {}, prompt }),
    });
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="fr" />);
    const original = (getCode() as HTMLTextAreaElement).value;

    fireEvent.click(await screen.findByRole("button", { name: labels.aiTitle }));
    fireEvent.change(await screen.findByRole("textbox", { name: labels.aiTitle }), {
      target: { value: "make it a square" },
    });
    await act(async function submitRequest() {
      fireEvent.click(screen.getByRole("button", { name: labels.aiSubmit }));
    });

    expect(prompt).toHaveBeenCalledWith(
      expect.stringContaining("make it a square"),
      expect.anything(),
    );
    expect(getCode()).toHaveValue(square + "\n");
    fireEvent.click(screen.getByRole("button", { name: labels.aiUndo }));
    expect(getCode()).toHaveValue(original);
    vi.unstubAllGlobals();
  });

  it("keeps edits typed while the on-device model was working", async function () {
    let finishPrompt: ((value: string) => void) | undefined;
    vi.stubGlobal("LanguageModel", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("available"),
      create: vi.fn<() => Promise<unknown>>().mockResolvedValue({
        destroy() {},
        prompt: vi.fn<() => Promise<string>>(function waitForPrompt() {
          return new Promise(function deferResult(resolve) {
            finishPrompt = resolve;
          });
        }),
      }),
    });
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="de" />);

    fireEvent.click(await screen.findByRole("button", { name: labels.aiTitle }));
    fireEvent.change(await screen.findByRole("textbox", { name: labels.aiTitle }), {
      target: { value: "make it a square" },
    });
    await act(async function submitRequest() {
      fireEvent.click(screen.getByRole("button", { name: labels.aiSubmit }));
    });
    fireEvent.change(getCode(), { target: { value: square.replace("10", "12") } });
    await act(async function finishRequest() {
      finishPrompt?.(JSON.stringify({ svg: square }));
    });

    expect(getCode()).toHaveValue(square.replace("10", "12"));
    vi.unstubAllGlobals();
  });

  it("opens an SVG file into the editor", async function () {
    render(<SvgEditor aiLabels={aiLabels} labels={labels} locale="en-US" />);
    const file = new File([square], "square.svg", { type: "image/svg+xml" });

    await act(async function openFile() {
      fireEvent.change(screen.getByLabelText(labels.open), { target: { files: [file] } });
    });

    expect(getCode()).toHaveValue(square);
  });
});
