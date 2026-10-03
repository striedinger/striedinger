import { createQpdfRunner, type QpdfRunner } from "qpdf-run";

import type { PdfCompressionMode, PdfOperationStage } from "./types";

import { rasterizePdf } from "./rasterize-pdf";

interface ProcessPdfOptions {
  compressionMode: PdfCompressionMode;
  password?: string;
  quality: number;
}

type ProgressCallback = (progress: number, stage: PdfOperationStage) => void;

const QPDF_ASSET_ROOT = "/vendor/qpdf-run/0.2.1";

let qpdfRunnerPromise: Promise<QpdfRunner> | undefined;

export async function optimizePdf(
  file: File,
  options: ProcessPdfOptions,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const output =
    options.compressionMode === "smallest"
      ? await rasterizePdf(file, options, onProgress)
      : await optimizePdfStructure(file, options, onProgress);
  onProgress?.(96, "comparing");
  return output.size < file.size ? output : file;
}

export async function unlockPdf(
  file: File,
  password?: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.(5, "preparing");
  const bytes = await runQpdf(
    file,
    [
      ...createPasswordArguments(password),
      "--decrypt",
      "--object-streams=generate",
      "--",
      "input.pdf",
      "output.pdf",
    ],
    onProgress,
  );
  return createPdfBlob(bytes);
}

async function optimizePdfStructure(
  file: File,
  options: ProcessPdfOptions,
  onProgress?: ProgressCallback,
) {
  onProgress?.(5, "preparing");
  const imageArguments = options.compressionMode === "balanced" ? ["--optimize-images"] : [];
  const bytes = await runQpdf(
    file,
    [
      ...createPasswordArguments(options.password),
      "--object-streams=generate",
      "--compress-streams=y",
      "--decode-level=generalized",
      "--recompress-flate",
      "--compression-level=9",
      ...imageArguments,
      "--",
      "input.pdf",
      "output.pdf",
    ],
    onProgress,
  );
  return createPdfBlob(bytes);
}

async function runQpdf(
  file: File,
  arguments_: string[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  onProgress?.(18, "decoding");
  const runner = await getQpdfRunner();
  onProgress?.(42, "compressing");
  try {
    const bytes = await runner.runOne({
      input: new Uint8Array(await file.arrayBuffer()),
      inputName: "input.pdf",
      outputName: "output.pdf",
      args: arguments_,
    });
    onProgress?.(92, "compressing");
    return bytes;
  } catch (cause) {
    const error = cause as Error & { stderr?: string[] };
    const detail = error.stderr?.find(function findUsefulError(line) {
      return line.trim().length > 0;
    });
    throw new Error(detail ?? error.message ?? "The PDF could not be processed.", { cause });
  }
}

function getQpdfRunner() {
  const assetRootUrl = new URL(`${QPDF_ASSET_ROOT}/`, globalThis.location.origin);

  qpdfRunnerPromise ??= createQpdfRunner({
    qpdfJsUrl: new URL("qpdf.js", assetRootUrl).href,
    timeoutMs: 120_000,
    wasmUrl: new URL("qpdf.wasm", assetRootUrl).href,
    workerUrl: new URL("worker.js", assetRootUrl).href,
  });
  return qpdfRunnerPromise.catch(function resetFailedRunner(error: unknown) {
    qpdfRunnerPromise = undefined;
    throw error;
  });
}

function createPasswordArguments(password?: string) {
  return password ? [`--password=${password}`] : [];
}

function createPdfBlob(bytes: Uint8Array) {
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}
