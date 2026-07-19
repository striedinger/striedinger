import type { PdfOperationStage } from "./types";

interface RasterizePdfOptions {
  password?: string;
  quality: number;
}

type ProgressCallback = (progress: number, stage: PdfOperationStage) => void;

export async function rasterizePdf(
  file: File,
  options: RasterizePdfOptions,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(8, "preparing");
  const [{ PDFDocument }, pdfjs] = await Promise.all([import("pdf-lib"), import("pdfjs-dist")]);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    password: options.password || undefined,
  });
  const input = await loadingTask.promise;
  const output = await PDFDocument.create();
  const targetDpi = Math.round(84 + options.quality * 72);
  onProgress?.(20, "decoding");

  async function appendPage(pageNumber: number): Promise<void> {
    if (pageNumber > input.numPages) return;

    const page = await input.getPage(pageNumber);
    const naturalViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: targetDpi / 72 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is unavailable in this browser.");

    try {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const jpeg = await canvasToBlob(canvas, options.quality);
      const embeddedPage = await output.embedJpg(await jpeg.arrayBuffer());
      const outputPage = output.addPage([naturalViewport.width, naturalViewport.height]);
      outputPage.drawImage(embeddedPage, {
        height: naturalViewport.height,
        width: naturalViewport.width,
        x: 0,
        y: 0,
      });
      onProgress?.(20 + Math.round((pageNumber / input.numPages) * 70), "compressing");
    } finally {
      page.cleanup();
      canvas.width = 1;
      canvas.height = 1;
    }

    await appendPage(pageNumber + 1);
  }

  try {
    await appendPage(1);
  } finally {
    await loadingTask.destroy();
  }

  const bytes = await output.save({ useObjectStreams: true });
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise(function createBlob(resolve, reject) {
    canvas.toBlob(
      function handleBlob(blob) {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("A PDF page could not be encoded."));
      },
      "image/jpeg",
      quality,
    );
  });
}
