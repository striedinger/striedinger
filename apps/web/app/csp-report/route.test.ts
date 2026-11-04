import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const { isRateLimited } = vi.hoisted(function createRateLimitMock() {
  return { isRateLimited: vi.fn<() => Promise<boolean>>() };
});

vi.mock("../../lib/rate-limit", function mockRateLimit() {
  return { isRateLimited };
});

let postReport: typeof import("./route").POST;
let warn: MockInstance<typeof console.warn>;

function sendReport(contentType: string, body: string) {
  return postReport(
    new NextRequest("https://striedinger.co/csp-report", {
      body,
      headers: { "content-type": contentType, "x-forwarded-for": "203.0.113.7" },
      method: "POST",
    }),
  );
}

function readLoggedViolations() {
  return warn.mock.calls.map(function parseLogLine(call) {
    return JSON.parse(String(call[0])) as Record<string, unknown>;
  });
}

const legacyReport = JSON.stringify({
  "csp-report": {
    "blocked-uri": "https://cdn.example/library.js?token=secret",
    disposition: "report",
    "document-uri": "https://striedinger.co/og?url=https%3A%2F%2Fprivate.example",
    "effective-directive": "script-src-elem",
    "line-number": 12,
    "source-file": "https://striedinger.co/_next/static/chunks/page.js",
  },
});

describe("CSP report collector", function () {
  beforeEach(async function loadFreshRoute() {
    vi.resetModules();
    isRateLimited.mockResolvedValue(false);
    warn = vi.spyOn(console, "warn").mockImplementation(function silenceLog() {});
    ({ POST: postReport } = await import("./route"));
  });

  afterEach(function restoreConsole() {
    vi.restoreAllMocks();
  });

  it("logs a report-uri violation without query strings", async function () {
    const response = await sendReport("application/csp-report", legacyReport);

    expect(response.status).toBe(204);
    expect(readLoggedViolations()).toEqual([
      {
        blocked: "https://cdn.example/library.js",
        directive: "script-src-elem",
        disposition: "report",
        document: "https://striedinger.co/og",
        event: "csp-violation",
        line: 12,
        sample: "",
        source: "https://striedinger.co/_next/static/chunks/page.js",
      },
    ]);
  });

  it("logs each violation in a Reporting API batch and skips other report types", async function () {
    const batch = JSON.stringify([
      {
        body: {
          blockedURL: "trusted-types-sink",
          disposition: "report",
          documentURL: "https://striedinger.co/notes",
          effectiveDirective: "require-trusted-types-for",
          sample: "Element innerHTML|<p>",
        },
        type: "csp-violation",
      },
      { body: { message: "deprecated" }, type: "deprecation" },
    ]);

    await sendReport("application/reports+json", batch);

    expect(readLoggedViolations()).toMatchObject([
      {
        blocked: "trusted-types-sink",
        directive: "require-trusted-types-for",
        document: "https://striedinger.co/notes",
        sample: "Element innerHTML|<p>",
      },
    ]);
  });

  it("logs a violation repeated on later page views only once", async function () {
    await sendReport("application/csp-report", legacyReport);
    await sendReport("application/csp-report", legacyReport);

    expect(warn).toHaveBeenCalledOnce();
  });

  it("rejects oversized and malformed bodies without logging", async function () {
    const oversized = await sendReport("application/csp-report", "x".repeat(70 * 1024));
    const malformed = await sendReport("application/csp-report", "{not json");

    expect(oversized.status).toBe(413);
    expect(malformed.status).toBe(400);
    expect(warn).not.toHaveBeenCalled();
  });

  it("stops logging a client that sends too many reports", async function () {
    isRateLimited.mockResolvedValue(true);

    const response = await sendReport("application/csp-report", legacyReport);

    expect(response.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });
});
