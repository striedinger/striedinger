import { describe, expect, it } from "vitest";

import { getClientIdentifierFromHeaders, normalizeClientAddress } from "./client-identifier";

describe("normalizeClientAddress", function () {
  it("gives every address in one IPv6 /64 the same identifier", function () {
    expect(normalizeClientAddress("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(normalizeClientAddress("2001:0DB8:0001:0002:ffff:ffff:ffff:ffff")).toBe(
      "2001:db8:1:2::/64",
    );
    expect(normalizeClientAddress("2001:db8:1:3::1")).toBe("2001:db8:1:3::/64");
  });

  it("keys IPv4-mapped IPv6 addresses as the IPv4 address", function () {
    expect(normalizeClientAddress("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeClientAddress("::ffff:cb00:7107")).toBe("203.0.113.7");
    expect(normalizeClientAddress("203.0.113.7")).toBe("203.0.113.7");
  });
});

describe("getClientIdentifierFromHeaders", function () {
  it("reads the first forwarded address", function () {
    const requestHeaders = new Headers({ "x-forwarded-for": "2001:db8::5, 10.0.0.1" });

    expect(getClientIdentifierFromHeaders(requestHeaders)).toBe("2001:db8:0:0::/64");
    expect(getClientIdentifierFromHeaders(new Headers())).toBe("unknown");
  });
});
