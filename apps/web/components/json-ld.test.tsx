import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JsonLd } from "./json-ld";

describe("JsonLd", function () {
  it("serializes structured data without allowing an HTML script breakout", function () {
    const { container } = render(<JsonLd value={{ name: "</script><script>alert(1)</script>" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script?.textContent).toContain("\\u003c/script>");
    expect(container.querySelectorAll("script")).toHaveLength(1);
  });
});
