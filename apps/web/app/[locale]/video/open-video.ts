import type { EncodedPacket } from "mediabunny";

import { BlobSource, CanvasSink, EncodedPacketSink, Input } from "mediabunny";

import type { VideoInfo } from "./types";
import type { VideoPlayback } from "./video-playback";

import { isLocationTag, videoInputFormats } from "./video-input";
import { createVideoPlayback } from "./video-playback";

export interface OpenedVideo {
  /** Plays the video onto a canvas; see `createVideoPlayback`. */
  createPlayback: (
    canvas: HTMLCanvasElement,
    onPausedChange: (paused: boolean) => void,
  ) => VideoPlayback;
  dispose: () => void;
  info: VideoInfo;
  /** The times of the video's keyframes, read from the container's index without decoding. */
  readKeyframeTimes: () => Promise<number[]>;
  /** Renders frames at the given times as small JPEG data URLs, for the trim filmstrip. */
  renderThumbnails: (
    times: readonly number[],
    height: number,
  ) => AsyncGenerator<{ time: number; url: string }>;
  /** Renders the frame at a time at full size as a JPEG. */
  renderFrame: (time: number) => Promise<Blob | null>;
}

/** Enough for a keyframe every second of a long video; snapping beyond it is not useful. */
const maximumKeyframes = 20_000;

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas) {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  return new Promise<Blob | null>(function encodeJpeg(resolve) {
    canvas.toBlob(resolve, "image/jpeg", 0.9);
  });
}

/** Reads a video's tracks and details without loading the file into memory. */
export async function openVideo(file: File): Promise<OpenedVideo> {
  const input = new Input({ formats: videoInputFormats, source: new BlobSource(file) });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("The file has no video track");
    const [audioTrack, duration, tags, canDecode] = await Promise.all([
      input.getPrimaryAudioTrack(),
      input.computeDuration(),
      input.getMetadataTags(),
      videoTrack.canDecode(),
    ]);
    // Packet statistics come from container metadata, so both tracks are read side by side.
    const [packetStats, audioStats] = await Promise.all([
      videoTrack.computePacketStats(120).catch(function unknownRate() {
        return null;
      }),
      audioTrack?.computePacketStats(500).catch(function unknownBitrate() {
        return null;
      }) ?? null,
    ]);
    const rotated = videoTrack.rotation === 90 || videoTrack.rotation === 270;
    const info: VideoInfo = {
      audioBitrate: audioStats?.averageBitrate ?? null,
      audioCodec: audioTrack?.codec ?? null,
      description: tags.description ?? "",
      duration,
      frameRate: packetStats ? Math.round(packetStats.averagePacketRate * 100) / 100 : null,
      hasAudio: audioTrack !== null,
      hasLocation: Object.keys(tags.raw ?? {}).some(isLocationTag),
      height: rotated ? videoTrack.squarePixelWidth : videoTrack.squarePixelHeight,
      title: tags.title ?? "",
      videoCodec: videoTrack.codec,
      width: rotated ? videoTrack.squarePixelHeight : videoTrack.squarePixelWidth,
    };
    const fullSizeSink = canDecode ? new CanvasSink(videoTrack, { poolSize: 1 }) : null;
    const playableAudioTrack = audioTrack && (await audioTrack.canDecode()) ? audioTrack : null;

    return {
      createPlayback(canvas, onPausedChange) {
        return createVideoPlayback({
          audioTrack: playableAudioTrack,
          canvas,
          duration,
          height: info.height,
          onPausedChange,
          videoTrack,
          width: info.width,
        });
      },
      dispose() {
        input.dispose();
      },
      info,
      async readKeyframeTimes() {
        const sink = new EncodedPacketSink(videoTrack);
        const times: number[] = [];
        async function collectFrom(packet: EncodedPacket | null): Promise<number[]> {
          if (!packet || times.length >= maximumKeyframes) return times;
          times.push(packet.timestamp);
          return collectFrom(await sink.getNextKeyPacket(packet, { metadataOnly: true }));
        }
        return collectFrom(await sink.getKeyPacket(0, { metadataOnly: true }));
      },
      async *renderThumbnails(times, height) {
        if (!canDecode) return;
        const width = Math.max(1, Math.round((height * info.width) / info.height));
        const sink = new CanvasSink(videoTrack, { fit: "cover", height, poolSize: 2, width });
        for await (const frame of sink.canvasesAtTimestamps(times)) {
          if (!frame) continue;
          const blob = await canvasToBlob(frame.canvas);
          if (blob) yield { time: frame.timestamp, url: await blobToDataUrl(blob) };
        }
      },
      async renderFrame(time) {
        const frame = await fullSizeSink?.getCanvas(time);
        return frame ? canvasToBlob(frame.canvas) : null;
      },
    };
  } catch (error) {
    input.dispose();
    throw error;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>(function readDataUrl(resolve, reject) {
    const reader = new FileReader();
    reader.addEventListener("load", function finishReading() {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", function failReading() {
      reject(reader.error ?? new Error("Could not read thumbnail"));
    });
    reader.readAsDataURL(blob);
  });
}
