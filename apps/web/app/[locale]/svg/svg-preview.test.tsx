import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SvgPreview } from "./svg-preview";

describe("svg preview", function () {
  it("shows large drawings from a data URL so they never run on the site's origin", function () {
    const source = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script>${"<g/>".repeat(20_000)}</svg>`;

    render(
      <SvgPreview
        accessory={null}
        background="grid"
        emptyLabel="Empty preview"
        isStale={false}
        label="Preview"
        source={source}
      />,
    );

    expect(screen.getByRole("img", { name: "Preview" }).getAttribute("src")).toMatch(
      /^data:image\/svg\+xml;/u,
    );
  });
});
