import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { OgPreviewFormLoader } from "./og-preview-form-loader";

const loadPreviewMetadata = vi.hoisted(function createMetadataLoaderMock() {
  return vi.fn<(url: string) => Promise<PreviewState>>();
});

vi.mock("./load-preview-metadata", function mockMetadataLoader() {
  return { loadPreviewMetadata };
});

vi.mock("./og-preview-form", function mockPreviewForm() {
  return { OgPreviewForm: MockPreviewForm };
});

function MockPreviewForm({ initialState }: { initialState: PreviewState }) {
  return <div data-testid="preview-state">{`${initialState.status}:${initialState.url}`}</div>;
}

describe("OgPreviewFormLoader", function () {
  beforeEach(function resetMetadataLoader() {
    loadPreviewMetadata.mockReset();
  });

  it("loads preview metadata immediately when the URL contains a request", async function () {
    loadPreviewMetadata.mockResolvedValue({
      error: "unreachable",
      status: "error",
      url: "https://example.com",
    });

    render(
      await OgPreviewFormLoader({
        initialUrl: "https://example.com",
        labels: {} as OgPreviewLabels,
      }),
    );

    expect(loadPreviewMetadata).toHaveBeenCalledWith("https://example.com");
    expect(screen.getByTestId("preview-state")).toHaveTextContent("error:https://example.com");
  });

  it("keeps the form idle when no URL was requested", async function () {
    render(await OgPreviewFormLoader({ initialUrl: "", labels: {} as OgPreviewLabels }));

    expect(loadPreviewMetadata).not.toHaveBeenCalled();
    expect(screen.getByTestId("preview-state")).toHaveTextContent("idle:");
  });
});
