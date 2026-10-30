import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisitServerData } from "./log-visit";

import { createCardLinkPath } from "./card-link-signature";
import { GET } from "./route";

const { pendingAfterCallbacks, recordVisit } = vi.hoisted(function createMocks() {
  return {
    pendingAfterCallbacks: [] as Array<() => Promise<void>>,
    recordVisit: vi.fn<(visitId: string, data: VisitServerData) => Promise<void>>(),
  };
});

vi.mock("next/server", async function mockAfter(importOriginal) {
  return {
    ...(await importOriginal<typeof import("next/server")>()),
    after(callback: () => Promise<void>) {
      pendingAfterCallbacks.push(callback);
    },
  };
});

vi.mock("./log-visit", async function mockRecordVisit(importOriginal) {
  return { ...(await importOriginal<typeof import("./log-visit")>()), recordVisit };
});

const targetUrl = "https://example.com/article?id=1";

async function requestTrackedLink(path: string, clientAddress = "203.0.113.1") {
  const response = await GET(
    new NextRequest(`https://striedinger.co${path}`, {
      headers: { "x-forwarded-for": clientAddress },
    }),
  );
  await Promise.all(
    pendingAfterCallbacks.splice(0).map(function runCallback(callback) {
      return callback();
    }),
  );
  return response;
}

async function summarizeResponse(response: Response) {
  return {
    blocksScripts: response.headers.get("content-security-policy")?.includes("default-src 'none'"),
    isNoIndex: response.headers.get("x-robots-tag")?.includes("noindex"),
    linksToTarget: (await response.text()).includes(`href="${targetUrl}"`),
    location: response.headers.get("location"),
    recordedVisits: recordVisit.mock.calls.length,
    status: response.status,
  };
}

const confirmationPage = {
  blocksScripts: true,
  isNoIndex: true,
  linksToTarget: true,
  location: null,
  recordedVisits: 0,
  status: 200,
};

beforeEach(function () {
  vi.stubEnv("CARD_LINK_SECRET", "test-secret");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  recordVisit.mockClear();
});

afterEach(function () {
  vi.unstubAllEnvs();
});

describe("GET /r", function () {
  it("redirects signed links and records the visit", async function () {
    const response = await requestTrackedLink(await createCardLinkPath(targetUrl));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(targetUrl);
    expect(recordVisit).toHaveBeenCalledOnce();
  });

  it("asks before following unsigned links", async function () {
    const response = await requestTrackedLink(`/r?url=${encodeURIComponent(targetUrl)}`);

    expect(await summarizeResponse(response)).toEqual(confirmationPage);
  });

  it("asks before following a signature reused for another target", async function () {
    const signedPath = await createCardLinkPath("https://example.com/");
    const signature = new URLSearchParams(signedPath.split("?")[1]).get("sig");
    const query = new URLSearchParams({ url: targetUrl, sig: String(signature) });

    const response = await requestTrackedLink(`/r?${query.toString()}`);

    expect(await summarizeResponse(response)).toEqual(confirmationPage);
  });

  it("asks before following links signed with another secret", async function () {
    const path = await createCardLinkPath(targetUrl);
    vi.stubEnv("CARD_LINK_SECRET", "rotated-secret");

    const response = await requestTrackedLink(path);

    expect(await summarizeResponse(response)).toEqual(confirmationPage);
  });

  it("escapes the destination on the confirmation page", async function () {
    const hostileUrl = `https://example.com/"><script>alert(1)</script>?a=1&b='x'`;

    const response = await requestTrackedLink(`/r?url=${encodeURIComponent(hostileUrl)}`);
    const html = await response.text();

    expect(html).not.toContain("<script>");
    expect(html).toContain("?a=1&amp;b=");
  });

  it("keeps redirecting but stops recording visits once a client exceeds the limit", async function () {
    const path = await createCardLinkPath(targetUrl);
    const clientAddress = `2001:db8:${Math.floor(Math.random() * 0xff_ff).toString(16)}::1`;

    for (let visit = 0; visit < 31; visit += 1) {
      // oxlint-disable-next-line no-await-in-loop -- each visit must count before the next one
      const response = await requestTrackedLink(path, clientAddress);
      expect(response.status).toBe(302);
    }

    expect(recordVisit).toHaveBeenCalledTimes(30);
  });
});
