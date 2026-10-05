/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import { AudioSampleSink, BlobSource, Input } from "mediabunny";

import type { TranscriptionReply, TranscriptionRequest } from "./transcription-messages";
import type { VideoCaption } from "./types";

import { splitLongCaption } from "./captions";
import { videoInputFormats } from "./open-video";
import { maximumTranscriptionSeconds } from "./transcription-messages";

// Whisper hears 16 kHz mono audio.
const whisperSampleRate = 16_000;
const modelId = "onnx-community/whisper-tiny";

interface WhisperChunk {
  text: string;
  timestamp: [number, number | null];
}

type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>,
) => Promise<{ chunks?: WhisperChunk[]; text: string }>;

let transcriberPromise: Promise<Transcriber> | null = null;

function reply(message: TranscriptionReply) {
  self.postMessage(message);
}

async function hasWebGpu() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  return Boolean(gpu && (await gpu.requestAdapter().catch(() => null)));
}

/**
 * Loads Whisper tiny once per page. With WebGPU, the encoder, which does most of the work, runs
 * on the GPU as a 9 MB 4-bit model; otherwise everything runs on the CPU at 8 bits. The 31 MB
 * 8-bit decoder runs on the CPU either way, which keeps the download small and decoding fast.
 */
function loadTranscriber() {
  transcriberPromise ??= (async function createTranscriber() {
    const useWebGpu = await hasWebGpu();
    const runtimeVersion = env.backends.onnx.versions?.web;
    const runtimeBuild = useWebGpu ? "ort-wasm-simd-threaded.asyncify" : "ort-wasm-simd-threaded";
    const runtimeBase = new URL(`/vendor/onnxruntime-web/${runtimeVersion}/`, self.location.origin);
    env.allowLocalModels = false;
    if (env.backends.onnx.wasm) {
      env.backends.onnx.wasm.wasmPaths = {
        mjs: new URL(`${runtimeBuild}.mjs`, runtimeBase).href,
        wasm: new URL(`${runtimeBuild}.wasm`, runtimeBase).href,
      };
    }
    const downloads = new Map<string, { loaded: number; total: number }>();
    const transcriber = await pipeline("automatic-speech-recognition", modelId, {
      device: useWebGpu ? { decoder_model_merged: "wasm", encoder_model: "webgpu" } : "wasm",
      dtype: useWebGpu
        ? { decoder_model_merged: "q8", encoder_model: "q4" }
        : { decoder_model_merged: "q8", encoder_model: "q8" },
      progress_callback(event: { file?: string; loaded?: number; status: string; total?: number }) {
        if (event.status !== "progress" || !event.file || !event.total) return;
        downloads.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
        let loaded = 0;
        let total = 0;
        for (const download of downloads.values()) {
          loaded += download.loaded;
          total += download.total;
        }
        reply({ kind: "download", progress: total > 0 ? loaded / total : 0 });
      },
    });
    return transcriber as unknown as Transcriber;
  })().catch(function forgetFailedLoad(error) {
    transcriberPromise = null;
    throw error;
  });
  return transcriberPromise;
}

/** Decodes the audio between two times and mixes it down to 16 kHz mono by averaging. */
async function readAudio(file: File, start: number, end: number) {
  const input = new Input({ formats: videoInputFormats, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const length = Math.ceil((end - start) * whisperSampleRate);
    const sums = new Float32Array(length);
    const counts = new Uint16Array(length);
    let channel = new Float32Array(0);
    for await (const sample of new AudioSampleSink(track).samples(start, end)) {
      const frames = sample.numberOfFrames;
      if (channel.length < frames) channel = new Float32Array(frames);
      const ratio = whisperSampleRate / sample.sampleRate;
      const offset = (sample.timestamp - start) * whisperSampleRate;
      for (let channelIndex = 0; channelIndex < sample.numberOfChannels; channelIndex += 1) {
        sample.copyTo(channel, {
          format: "f32-planar",
          frameCount: frames,
          planeIndex: channelIndex,
        });
        for (let frame = 0; frame < frames; frame += 1) {
          const target = Math.floor(offset + frame * ratio);
          if (target < 0 || target >= length) continue;
          sums[target] += channel[frame] ?? 0;
          counts[target] += 1;
        }
      }
      sample.close();
    }
    for (let index = 0; index < length; index += 1) {
      const count = counts[index] ?? 0;
      if (count > 0) sums[index] = (sums[index] ?? 0) / count;
    }
    return sums;
  } finally {
    input.dispose();
  }
}

async function transcribe({ end, file, start }: TranscriptionRequest) {
  if (end - start > maximumTranscriptionSeconds) {
    reply({ kind: "error", reason: "too-long" });
    return;
  }
  // The model downloads while the audio decodes.
  const [transcriber, audio] = await Promise.all([loadTranscriber(), readAudio(file, start, end)]);
  if (!audio) {
    reply({ kind: "error", reason: "no-audio" });
    return;
  }
  reply({ kind: "transcribing" });
  const result = await transcriber(audio, {
    chunk_length_s: 30,
    return_timestamps: true,
    stride_length_s: 5,
  });
  const captions: VideoCaption[] = (result.chunks ?? []).flatMap(function toCaptions(chunk) {
    const text = chunk.text.trim();
    const [chunkStart, chunkEnd] = chunk.timestamp;
    if (!text) return [];
    return splitLongCaption({
      end: Math.min(end, start + (chunkEnd ?? end - start)),
      id: crypto.randomUUID(),
      start: start + chunkStart,
      text,
    });
  });
  reply({ captions, kind: "done" });
}

self.addEventListener("message", function handleRequest(event: MessageEvent<TranscriptionRequest>) {
  transcribe(event.data).catch(function reportFailure() {
    reply({ kind: "error", reason: "failed" });
  });
});
