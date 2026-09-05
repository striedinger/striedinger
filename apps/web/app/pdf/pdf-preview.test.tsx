import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PdfToolLabels } from "./types";

import { PdfPreview } from "./pdf-preview";

const mocks = vi.hoisted(function createPdfMocks() {
  return {
    getDocument: vi.fn<() => { promise: Promise<unknown>; destroy: () => Promise<void> }>(),
    destroy: vi.fn<() => Promise<void>>(async function destroy() {}),
  };
});
vi.mock("pdfjs-dist", function mockPdfjs() {
  return { GlobalWorkerOptions: {}, getDocument: mocks.getDocument };
});

describe("PDF preview resources", function () {
  beforeEach(function resetMocks() {
    vi.clearAllMocks();
  });

  it("destroys a loading worker when the preview unmounts before opening finishes", async function () {
    mocks.getDocument.mockReturnValue({
      promise: new Promise(function pending() {}),
      destroy: mocks.destroy,
    });
    const file = new File(["pdf"], "test.pdf");
    Object.defineProperty(file, "arrayBuffer", {
      value: async function readFile() {
        return new ArrayBuffer(file.size);
      },
    });
    const view = render(
      <PdfPreview
        file={file}
        labels={{} as PdfToolLabels}
        password=""
        onPasswordResult={vi.fn<(requiresPassword: boolean, isValid: boolean) => void>()}
      />,
    );
    await waitFor(function startsLoading() {
      expect(mocks.getDocument).toHaveBeenCalled();
    });
    view.unmount();
    expect(mocks.destroy).toHaveBeenCalled();
  });

  it("does not create a worker when unmounted during the file read", async function () {
    const file = new File(["pdf"], "test.pdf");
    const pending = Promise.withResolvers<ArrayBuffer>();
    Object.defineProperty(file, "arrayBuffer", {
      value: function readFile() {
        return pending.promise;
      },
    });
    const view = render(
      <PdfPreview
        file={file}
        labels={{} as PdfToolLabels}
        password=""
        onPasswordResult={vi.fn<(requiresPassword: boolean, isValid: boolean) => void>()}
      />,
    );
    view.unmount();
    pending.resolve(new ArrayBuffer(3));
    await pending.promise;
    await Promise.resolve();
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });
});
