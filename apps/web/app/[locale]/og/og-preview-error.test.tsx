import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OgPreviewLabels } from "../../../lib/og/labels";

import { OgPreviewError } from "./og-preview-error";

const labels = {
  errors: { unreachable: "That page could not be reached within the allowed time." },
} as OgPreviewLabels;

describe("OgPreviewError", function () {
  it("explains why a requested page could not be previewed", async function () {
    render(
      await OgPreviewError({
        labels,
        preview: Promise.resolve({
          status: "error",
          url: "https://example.com",
          error: "unreachable",
        }),
      }),
    );

    expect(
      screen.getByText("That page could not be reached within the allowed time."),
    ).toBeInTheDocument();
  });

  it("stays empty when the preview succeeds", async function () {
    const { container } = render(
      await OgPreviewError({
        labels,
        preview: Promise.resolve({ status: "idle", url: "https://example.com" }),
      }),
    );

    expect(container).toBeEmptyDOMElement();
  });
});
