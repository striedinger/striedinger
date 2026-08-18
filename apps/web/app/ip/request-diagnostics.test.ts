import { describe, expect, it } from "vitest";

import { collectRequestDiagnostics, getClientIp } from "./request-diagnostics";

const labels = {
  city: "City",
  country: "Country",
  forwardedAddresses: "Forwarded addresses",
  host: "Host",
  ipVersionFour: "IPv4",
  ipVersionSix: "IPv6",
  latitude: "Latitude",
  longitude: "Longitude",
  protocol: "Protocol",
  region: "Region",
  timeZone: "Time zone",
  unavailable: "Unavailable",
};

describe("request diagnostics", function describeRequestDiagnostics() {
  it("prefers Vercel's protected forwarded address header", function testVercelAddress() {
    const requestHeaders = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-vercel-forwarded-for": "2001:db8::1, 192.0.2.1",
    });

    expect(getClientIp(requestHeaders)).toBe("2001:db8::1");
  });

  it("collects location and safe request metadata", function testRequestMetadata() {
    const requestHeaders = new Headers({
      "user-agent": "Example Browser",
      cookie: "private=value",
      "x-vercel-forwarded-for": "198.51.100.4",
      "x-vercel-ip-city": "New%20York",
      "x-vercel-ip-country": "US",
    });
    const diagnostics = collectRequestDiagnostics(requestHeaders, labels);

    expect(diagnostics.ipVersion).toBe("IPv4");
    expect(diagnostics.location).toContainEqual({ label: "City", value: "New York" });
    expect(diagnostics.headers).toEqual([{ label: "user-agent", value: "Example Browser" }]);
    expect(
      diagnostics.headers.some(function includesCookie(row) {
        return row.label === "cookie";
      }),
    ).toBe(false);
  });
});
