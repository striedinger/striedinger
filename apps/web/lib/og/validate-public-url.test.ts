import { beforeEach, describe, expect, it, vi } from "vitest";

import { validatePublicUrl } from "./validate-public-url";

const lookup = vi.hoisted(function createLookup() {
  return vi.fn<(...args: unknown[]) => Promise<Array<{ address: string; family: number }>>>();
});
vi.mock("node:dns/promises", function mockDns() {
  return { lookup };
});

describe("public preview URLs", function () {
  it("stops waiting for DNS when the request deadline expires", async function () {
    lookup.mockReturnValue(new Promise(function pendingLookup() {}));
    const controller = new AbortController();
    const validation = validatePublicUrl("https://example.com", controller.signal);
    controller.abort();
    await expect(validation).rejects.toMatchObject({ code: "unreachable" });
  });

  beforeEach(function resetDns() {
    lookup.mockReset();
  });

  it.each([
    "http://127.0.0.1",
    "http://10.1.2.3",
    "http://169.254.169.254",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://[fec0::1]",
    "http://[2002:7f00:1::]",
    "http://[2001::1]",
    "http://[3fff::1]",
    "http://[2001:0db8:0:0::1]",
    "http://[100::1]",
    "http://[64:ff9b::7f00:1]",
    "http://localhost.",
    "http://service.internal.",
  ])("rejects private, special-purpose, and local targets: %s", async function (url) {
    await expect(validatePublicUrl(url)).rejects.toMatchObject({ code: "unsafe-url" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(["https://8.8.8.8", "https://[2606:4700:4700::1111]"])(
    "accepts public literal addresses: %s",
    async function (url) {
      expect((await validatePublicUrl(url)).url.origin).toBe(url);
    },
  );

  it("rejects a DNS answer when any address is nonpublic", async function () {
    lookup.mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "0:0:0:0:0:ffff:7f00:1", family: 6 },
    ]);
    await expect(validatePublicUrl("https://example.com")).rejects.toMatchObject({
      code: "unsafe-url",
    });
  });
});
