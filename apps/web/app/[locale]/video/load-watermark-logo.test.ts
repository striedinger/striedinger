import { describe, expect, it } from "vitest";

import { loadWatermarkLogo } from "./load-watermark-logo";

describe("loadWatermarkLogo", function () {
  it("refuses files that are not images it accepts, without decoding them", async function () {
    const gif = new File([new Uint8Array(10)], "logo.gif", { type: "image/gif" });
    const html = new File(["<script></script>"], "logo.html", { type: "text/html" });
    await expect(loadWatermarkLogo(gif)).resolves.toBeNull();
    await expect(loadWatermarkLogo(html)).resolves.toBeNull();
  });

  it("refuses images over 5 MB", async function () {
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "logo.png", {
      type: "image/png",
    });
    await expect(loadWatermarkLogo(large)).resolves.toBeNull();
  });
});
