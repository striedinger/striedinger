import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects Instagram's WebView to the external browser", () => {
    const currentUrl = "https://striedinger.co/og?url=https%3A%2F%2Fexample.com";
    const request = new NextRequest(currentUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Instagram 345.0.0",
      },
    });

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `instagram://extbrowser/?url=${encodeURIComponent(currentUrl)}`,
    );
  });

  it("allows regular browser requests through", () => {
    const request = new NextRequest("https://striedinger.co/sudoku", {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari",
      },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not mistake a longer user-agent product name for Instagram", () => {
    const request = new NextRequest("https://striedinger.co/sudoku", {
      headers: { "user-agent": "InstagramBot/1.0" },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
