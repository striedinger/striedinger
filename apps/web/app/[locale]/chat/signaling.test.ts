import { describe, expect, it } from "vitest";

import { decodePairingBundle, encodePairingBundle } from "./signaling";

describe("pairing codes", function () {
  it("round trips a local WebRTC description and encryption key", async function () {
    const bundle = {
      description: { sdp: "v=0\r\na=candidate:local-device\r\n", type: "offer" as const },
      key: "a".repeat(43),
      version: 1 as const,
    };

    const code = await encodePairingBundle(bundle);

    await expect(decodePairingBundle(code)).resolves.toEqual(bundle);
  });

  it("rejects unrecognized input", async function () {
    await expect(decodePairingBundle("not-a-nearby-code")).rejects.toThrow(
      "Pairing code is invalid",
    );
  });

  it("rejects compressed codes that expand beyond the decoded limit", async function () {
    const code = await encodePairingBundle({
      description: { sdp: "a".repeat(100_000), type: "offer" },
      key: "a".repeat(43),
      version: 1,
    });

    await expect(decodePairingBundle(code)).rejects.toThrow(
      "Pairing code expands beyond the allowed size",
    );
  });
});
