import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proxy", () => {
  it("permanently redirects the www hostname to the canonical hostname", () => {
    const request = new NextRequest("https://www.striedinger.co/es/image?quality=80");

    const response = proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://striedinger.co/es/image?quality=80");
  });

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

  it("passes localized URLs to their route and persists the route locale", () => {
    const request = new NextRequest("https://striedinger.co/es/json?example=1");

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-route-locale")).toBe("es");
    expect(response.headers.get("set-cookie")).toContain("locale=es");
  });

  it("redirects English-prefixed URLs to their canonical unprefixed route", () => {
    const request = new NextRequest("https://striedinger.co/en/json?example=1");

    const response = proxy(request);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://striedinger.co/json?example=1");
  });

  it("uses blocking metadata rendering for AI search crawlers", () => {
    const request = new NextRequest("https://striedinger.co/og", {
      headers: { "user-agent": "OAI-SearchBot/1.0" },
    });

    const response = proxy(request);

    expect(response.headers.get("x-middleware-request-user-agent")).toBe("Bingbot/2.0");
    expect(response.headers.get("x-middleware-request-x-original-user-agent")).toBe(
      "OAI-SearchBot/1.0",
    );
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
