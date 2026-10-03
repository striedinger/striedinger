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

  it("moves links from the query-parameter versions of Podcasts and Notes to path routes", () => {
    const episode = proxy(
      new NextRequest("https://striedinger.co/es/podcasts?tab=library&podcast=42&episode=1000"),
    );
    const search = proxy(
      new NextRequest("https://striedinger.co/podcasts?tab=search&q=true+crime"),
    );
    const note = proxy(new NextRequest("https://striedinger.co/notes?folder=notes&note=abc-1"));

    expect(episode.status).toBe(308);
    expect(episode.headers.get("location")).toBe(
      "https://striedinger.co/es/podcasts/show/42/episode/1000",
    );
    expect(search.headers.get("location")).toBe(
      "https://striedinger.co/podcasts/search?q=true+crime",
    );
    expect(note.headers.get("location")).toBe("https://striedinger.co/notes/notes/abc-1");
  });

  it("renders unprefixed pages in English for visitors with no language preference", () => {
    const request = new NextRequest("https://striedinger.co/sudoku", {
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari",
      },
    });

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://striedinger.co/en/sudoku");
  });

  it("renders unprefixed pages in the saved or browser language without changing the URL", () => {
    const saved = proxy(
      new NextRequest("https://striedinger.co/json?example=1", {
        headers: { cookie: "locale=es", "accept-language": "de-DE,de;q=0.9" },
      }),
    );
    const browser = proxy(
      new NextRequest("https://striedinger.co/", { headers: { "accept-language": "ja,en;q=0.5" } }),
    );

    expect(saved.headers.get("x-middleware-rewrite")).toBe(
      "https://striedinger.co/es/json?example=1",
    );
    expect(browser.headers.get("x-middleware-rewrite")).toBe("https://striedinger.co/ja");
  });

  it("keeps shared Open Graph images for unprefixed URLs in English", () => {
    const response = proxy(
      new NextRequest("https://striedinger.co/json/opengraph-image", {
        headers: { cookie: "locale=es" },
      }),
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://striedinger.co/en/json/opengraph-image",
    );
  });

  it("leaves files and the redirect logger outside the localized routes", () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/r"]) {
      const response = proxy(new NextRequest(`https://striedinger.co${path}`));
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });

  it("passes localized URLs to their route and persists the route locale", () => {
    const request = new NextRequest("https://striedinger.co/es/json?example=1");

    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
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
