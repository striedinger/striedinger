import { describe, expect, it } from "vitest";

import { sanitizeFileName } from "./sanitize-file-name";

describe("sanitizeFileName", function () {
  it("removes bidirectional overrides that disguise the extension", function () {
    expect(sanitizeFileName("report‮fdp.exe")).toBe("reportfdp.exe");
    expect(sanitizeFileName("a⁦b⁩c‪d")).toBe("abcd");
  });

  it("removes control and zero-width characters", function () {
    expect(sanitizeFileName("in\u0000voice\u200B\u0007.pdf")).toBe("invoice.pdf");
    expect(sanitizeFileName("line\nbreak .txt")).toBe("linebreak.txt");
  });

  it("collapses whitespace padding so the extension stays visible", function () {
    expect(sanitizeFileName("photo.jpg                 .exe")).toBe("photo.jpg .exe");
  });

  it("caps the length without splitting characters", function () {
    const sanitizedName = sanitizeFileName("😀".repeat(300));

    expect(Array.from(sanitizedName)).toHaveLength(255);
    expect(sanitizedName).toBe("😀".repeat(255));
  });

  it("falls back to a safe name when nothing visible remains", function () {
    expect(sanitizeFileName("‮​  \u0000")).toBe("file");
  });
});
