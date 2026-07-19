import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockRunner {
  runOne(options: unknown): Promise<Uint8Array>;
}

const qpdfMocks = vi.hoisted(function createQpdfMocks() {
  return {
    createRunner: vi.fn<(options: unknown) => Promise<MockRunner>>(),
    rasterize: vi.fn<(...arguments_: unknown[]) => Promise<Blob>>(),
    runOne: vi.fn<(options: unknown) => Promise<Uint8Array>>(),
  };
});

vi.mock("qpdf-run", function mockQpdfRun() {
  return {
    createQpdfRunner: qpdfMocks.createRunner,
  };
});

vi.mock("./rasterize-pdf", function mockRasterizer() {
  return {
    rasterizePdf: qpdfMocks.rasterize,
  };
});

import { optimizePdf, unlockPdf } from "./process-pdf";

describe("PDF processing", function () {
  beforeEach(function resetMocks() {
    qpdfMocks.createRunner.mockResolvedValue({ runOne: qpdfMocks.runOne });
    qpdfMocks.runOne.mockResolvedValue(new Uint8Array([1, 2, 3]));
    qpdfMocks.rasterize.mockResolvedValue(
      new Blob([new Uint8Array([1]).buffer], { type: "application/pdf" }),
    );
    qpdfMocks.createRunner.mockClear();
    qpdfMocks.runOne.mockClear();
    qpdfMocks.rasterize.mockClear();
  });

  it("removes restrictions with the versioned local qpdf worker", async function () {
    const file = createPdfFile();
    const output = await unlockPdf(file);

    expect(output.type).toBe("application/pdf");
    expect(qpdfMocks.createRunner).toHaveBeenCalledWith({
      qpdfJsUrl: "/vendor/qpdf-run/0.2.1/qpdf.js",
      timeoutMs: 120_000,
      wasmUrl: "/vendor/qpdf-run/0.2.1/qpdf.wasm",
      workerUrl: "/vendor/qpdf-run/0.2.1/worker.js",
    });
    expect(qpdfMocks.runOne).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["--decrypt", "--object-streams=generate", "--", "input.pdf", "output.pdf"],
      }),
    );
  });

  it("keeps smallest-file rasterization separate from structural optimization", async function () {
    const file = createPdfFile();
    await optimizePdf(file, { compressionMode: "smallest", quality: 0.6 });

    expect(qpdfMocks.rasterize).toHaveBeenCalledWith(
      file,
      { compressionMode: "smallest", quality: 0.6 },
      undefined,
    );
    expect(qpdfMocks.runOne).not.toHaveBeenCalled();
  });
});

function createPdfFile() {
  return new File([new Uint8Array(128).buffer], "test.pdf", { type: "application/pdf" });
}
