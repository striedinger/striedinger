import type { CompressionMode } from "./types";

import { targetRatioForMode } from "./optimization-settings";

interface OptimizeImageMessage {
  bitmap?: ImageBitmap;
  buffer?: ArrayBuffer;
  compressionMode: CompressionMode;
  id: string;
  maxDimension: number;
  originalSize: number;
  outputFormat: "auto" | "image/avif" | "image/jpeg" | "image/png" | "image/webp";
  quality: number;
  type: string;
}

interface EncodedCandidate {
  blob: Blob;
  type: string;
}

interface PngQuantizer {
  quantizeImageData(
    imageData: ImageData,
    options: {
      dithering: number;
      maxColors: number;
      quality: { min: number; target: number };
      speed: number;
    },
  ): Promise<{ pngBytes: Uint8Array }>;
}

const worker = self as unknown as DedicatedWorkerGlobalScope;
let pngQuantizerPromise: Promise<PngQuantizer> | undefined;

worker.addEventListener(
  "message",
  async function optimizeImage(event: MessageEvent<OptimizeImageMessage>) {
    const {
      bitmap: transferredBitmap,
      buffer,
      compressionMode,
      id,
      maxDimension,
      originalSize,
      outputFormat,
      quality,
      type,
    } = event.data;

    try {
      reportProgress(id, 10, "decoding");
      const source = buffer ? new Blob([buffer], { type }) : undefined;
      const bitmap =
        transferredBitmap ??
        (source ? await createImageBitmap(source, { imageOrientation: "from-image" }) : undefined);
      if (!bitmap) throw new Error("This image could not be decoded.");
      reportProgress(id, 26, "decoding");
      const scale =
        maxDimension > 0 ? Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height)) : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });

      if (!context) throw new Error("Canvas is unavailable in this browser.");

      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      reportProgress(id, 34, "compressing");
      const imageData = context.getImageData(0, 0, width, height);
      const candidate =
        compressionMode === "lossless" && source
          ? await encodeLosslessCandidate(source, imageData, outputFormat)
          : await encodeSmallestCandidate(
              imageData,
              originalSize,
              outputFormat,
              Math.round(quality * 100),
              compressionMode,
              function updateProgress(progress, stage) {
                reportProgress(id, progress, stage);
              },
            );
      reportProgress(id, 100, "comparing");
      worker.postMessage({ blob: candidate.blob, id, type: candidate.type });
    } catch (error) {
      worker.postMessage({
        error: error instanceof Error ? error.message : "This image could not be decoded.",
        id,
      });
    }
  },
);

async function encodeSmallestCandidate(
  imageData: ImageData,
  originalSize: number,
  outputFormat: OptimizeImageMessage["outputFormat"],
  quality: number,
  compressionMode: CompressionMode,
  onProgress: (progress: number, stage: "compressing" | "comparing") => void,
): Promise<EncodedCandidate> {
  if (outputFormat === "image/png") {
    onProgress(52, "compressing");
    if (quality >= 94) return encodePng(imageData);
    try {
      return await encodeQuantizedPng(imageData, quality);
    } catch {
      return encodePng(imageData);
    }
  }

  if (outputFormat === "image/avif") {
    onProgress(52, "compressing");
    return encodeAvif(imageData, mapAvifQuality(quality));
  }
  if (outputFormat === "image/jpeg") {
    onProgress(52, "compressing");
    return encodeJpeg(imageData, quality);
  }
  if (outputFormat === "image/webp") {
    onProgress(52, "compressing");
    return encodeWebp(imageData, mapWebpQuality(quality));
  }

  const content = classifyImage(imageData);
  const encoders: Promise<EncodedCandidate>[] = [encodeWebp(imageData, mapWebpQuality(quality))];
  if (originalSize > 120_000 && imageData.width * imageData.height > 250_000) {
    encoders.push(encodeAvif(imageData, mapAvifQuality(quality)));
  }
  if (!content.transparent && content.photographic) encoders.push(encodeJpeg(imageData, quality));
  if (!content.photographic || content.transparent) {
    encoders.push(encodeQuantizedPng(imageData, quality), encodePng(imageData));
  }

  onProgress(46, "compressing");
  const encoded = await collectSuccessfulCandidates(encoders);
  onProgress(78, "comparing");
  const acceptable = await filterByPerceptualQuality(imageData, encoded, quality);
  let smallest = chooseSmallest(acceptable.length > 0 ? acceptable : encoded);

  const targetSize = originalSize * targetRatioForMode(quality, compressionMode);
  const qualityStep = compressionMode === "smallest" ? 20 : 14;
  const searchQualities = [
    Math.max(28, quality - qualityStep),
    Math.max(22, quality - qualityStep * 2),
  ];

  if (smallest.blob.size > targetSize) {
    onProgress(84, "compressing");
    const searchRounds = await Promise.all(
      searchQualities.map(async function searchAtQuality(searchQuality) {
        try {
          const searchEncoders: Promise<EncodedCandidate>[] = [
            encodeWebp(imageData, mapWebpQuality(searchQuality)),
          ];
          if (!content.transparent && content.photographic) {
            searchEncoders.push(encodeJpeg(imageData, searchQuality));
          } else {
            searchEncoders.push(encodeQuantizedPng(imageData, searchQuality));
          }

          const searchCandidates = await collectSuccessfulCandidates(searchEncoders);
          return filterByPerceptualQuality(imageData, searchCandidates, searchQuality);
        } catch {
          return [];
        }
      }),
    );
    onProgress(94, "comparing");
    const acceptableSearchCandidates = searchRounds.flat();
    if (acceptableSearchCandidates.length > 0) {
      smallest = chooseSmallest([smallest, ...acceptableSearchCandidates]);
    }
  }

  return smallest;
}

async function encodeLosslessCandidate(
  source: Blob,
  imageData: ImageData,
  outputFormat: OptimizeImageMessage["outputFormat"],
) {
  const candidates: EncodedCandidate[] = [{ blob: source, type: source.type }];
  const encoders: Promise<EncodedCandidate>[] = [];

  if (source.type === "image/jpeg") encoders.push(stripJpegMetadata(source));
  if (outputFormat === "auto" || outputFormat === "image/webp") {
    encoders.push(encodeLosslessWebp(imageData));
  }
  if (outputFormat === "image/avif") encoders.push(encodeLosslessAvif(imageData));
  if (outputFormat === "image/png" || (outputFormat === "auto" && source.type === "image/png")) {
    encoders.push(encodePng(imageData));
  }

  const results = await Promise.allSettled(encoders);
  for (const result of results) {
    if (result.status === "fulfilled") candidates.push(result.value);
  }
  return chooseSmallest(candidates);
}

async function stripJpegMetadata(source: Blob): Promise<EncodedCandidate> {
  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { blob: source, type: source.type };

  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;
  while (offset + 3 < bytes.length) {
    const segmentStart = offset;
    if (bytes[offset] !== 0xff) break;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset] ?? 0;
    offset += 1;

    if (marker === 0xda || marker === 0xd9) {
      chunks.push(bytes.slice(segmentStart));
      offset = bytes.length;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(bytes.slice(segmentStart, offset));
      continue;
    }

    const length = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    if (length < 2 || offset + length > bytes.length) break;
    const segmentEnd = offset + length;
    const isMetadata = marker === 0xfe || (marker === 0xe1 && isXmpSegment(bytes, offset + 2));
    if (!isMetadata) chunks.push(bytes.slice(segmentStart, segmentEnd));
    offset = segmentEnd;
  }

  if (offset < bytes.length) return { blob: source, type: source.type };
  const totalLength = chunks.reduce(function addLength(total, chunk) {
    return total + chunk.byteLength;
  }, 0);
  const stripped = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    stripped.set(chunk, writeOffset);
    writeOffset += chunk.byteLength;
  }
  return { blob: new Blob([stripped.buffer], { type: "image/jpeg" }), type: "image/jpeg" };
}

function isXmpSegment(bytes: Uint8Array, offset: number) {
  const xmpSignature = "http://ns.adobe.com/xap/1.0/";
  if (offset + xmpSignature.length > bytes.length) return false;
  for (let index = 0; index < xmpSignature.length; index += 1) {
    if (bytes[offset + index] !== xmpSignature.charCodeAt(index)) return false;
  }
  return true;
}

async function collectSuccessfulCandidates(encoders: Promise<EncodedCandidate>[]) {
  const results = await Promise.allSettled(encoders);
  const candidates = results.flatMap(function collectCandidate(result) {
    return result.status === "fulfilled" ? [result.value] : [];
  });
  if (candidates.length === 0) throw new Error("No compatible image encoder was available.");
  return candidates;
}

function chooseSmallest(candidates: EncodedCandidate[]) {
  const first = candidates[0];
  if (!first) throw new Error("No compatible image encoder was available.");
  return candidates.reduce(function chooseSmaller(smallest, candidate) {
    return candidate.blob.size < smallest.blob.size ? candidate : smallest;
  }, first);
}

function mapAvifQuality(quality: number) {
  return Math.max(22, Math.round(quality - 22));
}

function mapWebpQuality(quality: number) {
  return Math.max(30, quality - 8);
}

async function encodeAvif(imageData: ImageData, quality: number): Promise<EncodedCandidate> {
  const { encode } = await import("@jsquash/avif");
  const buffer = await encode(imageData, {
    enableSharpYUV: true,
    quality,
    qualityAlpha: quality,
    speed: 8,
  });
  return { blob: new Blob([buffer], { type: "image/avif" }), type: "image/avif" };
}

async function encodeLosslessAvif(imageData: ImageData): Promise<EncodedCandidate> {
  const { encode } = await import("@jsquash/avif");
  const buffer = await encode(imageData, {
    bitDepth: 8,
    lossless: true,
    quality: 100,
    qualityAlpha: 100,
    speed: 7,
    subsample: 3,
  });
  return { blob: new Blob([buffer], { type: "image/avif" }), type: "image/avif" };
}

async function encodeJpeg(imageData: ImageData, quality: number): Promise<EncodedCandidate> {
  const { encode } = await import("@jsquash/jpeg");
  const buffer = await encode(imageData, {
    chroma_quality: quality,
    optimize_coding: true,
    progressive: true,
    quality,
    trellis_multipass: true,
    trellis_opt_table: true,
  });
  return { blob: new Blob([buffer], { type: "image/jpeg" }), type: "image/jpeg" };
}

async function encodeWebp(imageData: ImageData, quality: number): Promise<EncodedCandidate> {
  const { encode } = await import("@jsquash/webp");
  const buffer = await encode(imageData, {
    alpha_quality: quality,
    autofilter: 1,
    method: 6,
    pass: 6,
    quality,
    use_sharp_yuv: 1,
  });
  return { blob: new Blob([buffer], { type: "image/webp" }), type: "image/webp" };
}

async function encodeLosslessWebp(imageData: ImageData): Promise<EncodedCandidate> {
  const { encode } = await import("@jsquash/webp");
  const buffer = await encode(imageData, {
    alpha_quality: 100,
    exact: 1,
    lossless: 1,
    method: 6,
    near_lossless: 100,
    pass: 10,
    quality: 100,
  });
  return { blob: new Blob([buffer], { type: "image/webp" }), type: "image/webp" };
}

async function encodePng(imageData: ImageData): Promise<EncodedCandidate> {
  const { optimise } = await import("@jsquash/oxipng");
  const buffer = await optimise(imageData, { level: 4, optimiseAlpha: true });
  return { blob: new Blob([buffer], { type: "image/png" }), type: "image/png" };
}

async function encodeQuantizedPng(
  imageData: ImageData,
  quality: number,
): Promise<EncodedCandidate> {
  const quantizer = await getPngQuantizer();
  const colorRange = Math.max(0, Math.min(1, (quality - 40) / 55));
  const result = await quantizer.quantizeImageData(imageData, {
    dithering: 0.75,
    maxColors: Math.round(48 + colorRange * 208),
    quality: { min: Math.max(30, quality - 12), target: quality },
    speed: 4,
  });
  const quantizedBytes = new Uint8Array(result.pngBytes);
  const { optimise } = await import("@jsquash/oxipng");
  const optimized = await optimise(quantizedBytes.buffer, { level: 4, optimiseAlpha: true });
  const bytes = optimized.byteLength < quantizedBytes.byteLength ? optimized : quantizedBytes;
  return {
    blob: new Blob([bytes], { type: "image/png" }),
    type: "image/png",
  };
}

function getPngQuantizer() {
  pngQuantizerPromise ??= Promise.all([
    import("@fe-daily/libimagequant-wasm"),
    import("@fe-daily/libimagequant-wasm/wasm/libimagequant_wasm.js"),
  ]).then(function createQuantizer([module, wasm]) {
    return new module.default({ wasmModule: wasm });
  });
  return pngQuantizerPromise;
}

async function filterByPerceptualQuality(
  source: ImageData,
  candidates: EncodedCandidate[],
  quality: number,
) {
  const { ssim } = await import("ssim.js");
  const sourceSample = sampleImageData(source);
  const threshold = 0.86 + quality / 5_000;
  const results = await Promise.all(
    candidates.map(async function measureCandidate(candidate) {
      const candidateSample = await sampleBlob(
        candidate.blob,
        sourceSample.width,
        sourceSample.height,
      );
      return ssim(sourceSample, candidateSample, { downsample: "original" }).mssim >= threshold
        ? candidate
        : undefined;
    }),
  );
  return results.filter(function isCandidate(candidate): candidate is EncodedCandidate {
    return candidate !== undefined;
  });
}

function reportProgress(
  id: string,
  progress: number,
  stage: "decoding" | "compressing" | "comparing",
) {
  worker.postMessage({ id, progress, stage });
}

function sampleImageData(imageData: ImageData) {
  const scale = Math.min(1, 384 / Math.max(imageData.width, imageData.height));
  const width = Math.max(1, Math.round(imageData.width * scale));
  const height = Math.max(1, Math.round(imageData.height * scale));
  const sample = new ImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(imageData.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(imageData.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * imageData.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      sample.data[targetIndex] = imageData.data[sourceIndex] ?? 0;
      sample.data[targetIndex + 1] = imageData.data[sourceIndex + 1] ?? 0;
      sample.data[targetIndex + 2] = imageData.data[sourceIndex + 2] ?? 0;
      sample.data[targetIndex + 3] = imageData.data[sourceIndex + 3] ?? 255;
    }
  }

  return sample;
}

async function sampleBlob(blob: Blob, width: number, height: number) {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return context.getImageData(0, 0, width, height);
}

function classifyImage(imageData: ImageData) {
  const colors = new Set<number>();
  const pixelCount = imageData.width * imageData.height;
  const stride = Math.max(4, Math.floor(pixelCount / 8_192) * 4);
  let transparent = false;

  for (let index = 0; index < imageData.data.length; index += stride) {
    const alpha = imageData.data[index + 3] ?? 255;
    if (alpha !== 255) transparent = true;
    const red = (imageData.data[index] ?? 0) >> 3;
    const green = (imageData.data[index + 1] ?? 0) >> 3;
    const blue = (imageData.data[index + 2] ?? 0) >> 3;
    colors.add((red << 10) | (green << 5) | blue);
    if (colors.size > 768 && transparent) break;
  }

  return { photographic: colors.size > 384, transparent };
}

export { worker };
