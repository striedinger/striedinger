/// <reference lib="webworker" />

import type { MetadataTags, Target, VideoSample } from "mediabunny";

import {
  BlobSource,
  BufferTarget,
  Conversion,
  ConversionCanceledError,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  StreamTarget,
  TextSubtitleSource,
} from "mediabunny";

import type { ExportCommand, ExportReply, ExportRequest } from "./export-messages";

import { captionsToWebVtt, findCaptionAt } from "./captions";
import { drawCaption } from "./draw-caption";
import { isLocationTag, videoInputFormats } from "./open-video";

let activeConversion: Conversion | null = null;

function reply(message: ExportReply) {
  self.postMessage(message);
}

interface ExportTarget {
  /** Releases the file after a failed or canceled export. */
  discard: () => void;
  finish: () => Promise<File>;
  target: Target;
}

/**
 * Writes straight to a file in the origin private file system, so a long video is never held
 * in memory. Browsers without it fall back to an in-memory buffer.
 */
async function createTarget(outputName: string): Promise<ExportTarget> {
  try {
    const directory = await navigator.storage.getDirectory();
    const handle = await directory.getFileHandle(`export-${outputName}`, { create: true });
    const access = await handle.createSyncAccessHandle();
    access.truncate(0);
    const writable = new WritableStream<{ data: Uint8Array; position: number }>({
      write(chunk) {
        access.write(chunk.data, { at: chunk.position });
      },
    });
    return {
      discard() {
        access.close();
      },
      async finish() {
        access.flush();
        access.close();
        const file = await handle.getFile();
        return new File([file], outputName, { type: "video/mp4" });
      },
      target: new StreamTarget(writable),
    };
  } catch {
    const target = new BufferTarget();
    return {
      discard() {},
      async finish() {
        return new File([target.buffer ?? new ArrayBuffer(0)], outputName, { type: "video/mp4" });
      },
      target,
    };
  }
}

async function createTags(request: ExportRequest, inputTags: MetadataTags): Promise<MetadataTags> {
  const raw = { ...inputTags.raw };
  if (request.details.removeLocation) {
    for (const key of Object.keys(raw)) if (isLocationTag(key)) delete raw[key];
  }
  const cover = request.cover
    ? [
        {
          data: new Uint8Array(await request.cover.arrayBuffer()),
          kind: "coverFront" as const,
          mimeType: "image/jpeg",
        },
      ]
    : inputTags.images;
  return {
    ...inputTags,
    description: request.details.description.trim() || undefined,
    images: cover,
    raw,
    title: request.details.title.trim() || undefined,
  };
}

/** Burns captions into each frame; frames arrive with rotation already applied. */
function createCaptionBurner(request: ExportRequest) {
  let canvas: OffscreenCanvas | null = null;
  let timeOffset: number | null = null;
  return function burnCaption(sample: VideoSample) {
    // Frames may be timed from the trim start or from the original video; the first frame tells.
    timeOffset ??= sample.timestamp < request.trim.start - 0.25 ? request.trim.start : 0;
    const caption = findCaptionAt(request.captions, sample.timestamp + timeOffset);
    if (!caption?.text.trim()) return sample;
    const width = sample.displayWidth;
    const height = sample.displayHeight;
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      canvas = new OffscreenCanvas(width, height);
    }
    const context = canvas.getContext("2d");
    if (!context) return sample;
    sample.draw(context, 0, 0, width, height);
    drawCaption(context, caption.text.trim(), width, height);
    return canvas;
  };
}

async function exportVideo(request: ExportRequest) {
  const input = new Input({ formats: videoInputFormats, source: new BlobSource(request.file) });
  const { discard, finish, target } = await createTarget(request.outputName);
  const output = new Output({ format: new Mp4OutputFormat(), target });
  try {
    const hasCaptions = request.captions.some(function hasText(caption) {
      return caption.text.trim() !== "";
    });
    const burnsCaptions = hasCaptions && request.captionMode === "burned";
    const addsSubtitleTrack = hasCaptions && request.captionMode === "track";
    const subtitles = addsSubtitleTrack ? new TextSubtitleSource("webvtt") : null;
    if (subtitles) output.addSubtitleTrack(subtitles);

    const conversion = await Conversion.init({
      audio: { quality: QUALITY_HIGH },
      composable: true,
      input,
      output,
      showWarnings: false,
      trim: request.trim,
      video: burnsCaptions
        ? {
            allowTransformationMetadata: false,
            process: createCaptionBurner(request),
            quality: QUALITY_HIGH,
          }
        : { forceTranscode: request.exactCuts, quality: QUALITY_HIGH },
    });
    if (!conversion.isValid) throw new Error("This video cannot be converted");
    activeConversion = conversion;
    conversion.onProgress = function reportProgress(progress) {
      reply({ kind: "progress", progress });
    };
    output.setMetadataTags(await createTags(request, await input.getMetadataTags()));
    await output.start();
    await Promise.all([
      conversion.execute(),
      subtitles
        ? subtitles
            .add(captionsToWebVtt(request.captions, request.trim))
            .then(function closeTrack() {
              subtitles.close();
              return undefined;
            })
        : Promise.resolve(),
    ]);
    await output.finalize();
    reply({ file: await finish(), kind: "done" });
  } catch (error) {
    await output.cancel().catch(() => undefined);
    discard();
    reply(error instanceof ConversionCanceledError ? { kind: "canceled" } : { kind: "error" });
  } finally {
    activeConversion = null;
    input.dispose();
  }
}

self.addEventListener("message", function handleCommand(event: MessageEvent<ExportCommand>) {
  if (event.data.kind === "cancel") {
    void activeConversion?.cancel();
    return;
  }
  void exportVideo(event.data);
});
