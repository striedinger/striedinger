import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { JsonToolLabels } from "./types";

import { JsonTool } from "./json-tool";
import { processJson } from "./process-json";

const labels: JsonToolLabels = {
  collapseAll: "Collapse all",
  collapseValue: "Collapse value",
  description: "Description",
  emptyPreview: "Empty preview",
  expandAll: "Expand all",
  expandValue: "Expand value",
  inputLabel: "JSON input",
  invalid: "Invalid JSON: {error}",
  placeholder: "Paste JSON here",
  preview: "Preview",
  privacy: "Private",
  title: "JSON tool",
  tooComplex: "Too complex",
  tooLarge: "Too large",
  valid: "Valid JSON",
};

afterEach(function restoreTimers() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("JsonTool", function () {
  it("sends debounced input to a worker and displays its result", async function () {
    vi.useFakeTimers();
    class JsonWorker extends EventTarget {
      terminate = vi.fn<() => void>();
      postMessage(input: string) {
        this.dispatchEvent(new MessageEvent("message", { data: processJson(input) }));
      }
    }
    vi.stubGlobal("Worker", JsonWorker);
    render(<JsonTool labels={labels} />);
    fireEvent.change(screen.getByRole("textbox", { name: labels.inputLabel }), {
      target: { value: '{"worker":true}' },
    });
    await act(async function finishDebounce() {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(screen.getByText(labels.valid)).toBeInTheDocument();
    expect(screen.getByText('"worker":')).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: labels.inputLabel })).toHaveValue(
      '{\n  "worker": true\n}',
    );
  });

  it("formats and previews JSON when Web Workers are unavailable", async function () {
    vi.useFakeTimers();
    render(<JsonTool labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: labels.inputLabel }), {
      target: { value: '{"value":1}' },
    });
    await act(async function finishDebounce() {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    vi.useRealTimers();

    await waitFor(function waitForFormattedInput() {
      expect(screen.getByRole("textbox", { name: labels.inputLabel })).toHaveValue(
        '{\n  "value": 1\n}',
      );
    });
    expect(screen.getByText(labels.valid)).toBeInTheDocument();
    expect(screen.getByText('"value":')).toBeInTheDocument();
  });

  it("does not process input beyond the local safety limit", async function () {
    vi.useFakeTimers();
    render(<JsonTool labels={labels} />);

    fireEvent.change(screen.getByRole("textbox", { name: labels.inputLabel }), {
      target: { value: "x".repeat(500_001) },
    });
    await act(async function finishDebounce() {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText(labels.tooLarge)).toBeInTheDocument();
    expect(screen.queryByText(labels.valid)).not.toBeInTheDocument();
  });
});
