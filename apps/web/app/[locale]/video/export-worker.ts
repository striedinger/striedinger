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
  Quality,
  StreamTarget,
  TextSubtitleSource,
} from "mediabunny";

import type { ExportCommand, ExportReply, ExportRequest } from "./export-messages";

import { toIso6392, toLanguageTag } from "./caption-language";
import { captionsToWebVtt, findCaptionAt } from "./captions";
import { drawCaption } from "./draw-caption";
import { isLocationTag, videoInputFormats } from "./video-input";

let activeConversion: Conversion | null = null;

/** Progress is reported at most this often, since each message re-renders the editor. */
const progressIntervalMilliseconds = 100;
const exportFilePrefix = "export-";

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
    // Cleanup is best effort; older Safari cannot list a directory, which must not cost OPFS.
    await removeEarlierExports(directory).catch(function keepEarlierExports() {
      return undefined;
    });
    const handle = await directory.getFileHandle(`${exportFilePrefix}${outputName}`, {
      create: true,
    });
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

/**
 * Deletes the files earlier exports left behind. Only the latest export is ever offered for
 * saving, and phones have little storage to spare for old ones.
 */
async function removeEarlierExports(directory: FileSystemDirectoryHandle) {
  const names: string[] = [];
  for await (const name of directory.keys()) {
    if (name.startsWith(exportFilePrefix)) names.push(name);
  }
  await Promise.allSettled(
    names.map(function removeExport(name) {
      return directory.removeEntry(name);
    }),
  );
}

/** Tags the subtitle track with its language and that language's own name, like "français". */
function describeSubtitleTrack(language: string | null) {
  if (!language) return {};
  const languageCode = toIso6392(language);
  let name: string | undefined;
  try {
    const tag = toLanguageTag(language);
    name = new Intl.DisplayNames([tag], { type: "language" }).of(tag);
  } catch {
    name = undefined;
  }
  return { languageCode, name };
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
    if (subtitles)
      output.addSubtitleTrack(subtitles, describeSubtitleTrack(request.captionLanguage));

    const highQuality = new Quality("high");
    const { resize } = request;
    // Resizing re-encodes frames rotated upright, so the size is the one people see.
    const resizeOptions = resize
      ? {
          allowTransformationMetadata: false,
          fit: "fill" as const,
          height: resize.height,
          quality: new Quality({ bitrate: resize.bitrate }),
          width: resize.width,
        }
      : { quality: highQuality };
    const conversion = await Conversion.init({
      audio: { quality: highQuality },
      composable: true,
      input,
      output,
      showWarnings: false,
      trim: request.trim,
      video: burnsCaptions
        ? {
            allowTransformationMetadata: false,
            process: createCaptionBurner(request),
            ...resizeOptions,
          }
        : { forceTranscode: request.exactCuts, ...resizeOptions },
    });
    if (!conversion.isValid) throw new Error("This video cannot be converted");
    activeConversion = conversion;
    let lastProgressTime = 0;
    conversion.onProgress = function reportProgress(progress) {
      const now = performance.now();
      if (now - lastProgressTime < progressIntervalMilliseconds) return;
      lastProgressTime = now;
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
