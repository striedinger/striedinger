/// <reference lib="webworker" />

import { env, pipeline, Tensor } from "@huggingface/transformers";
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

interface Transcriber {
  (
    audio: Float32Array,
    options: Record<string, unknown>,
  ): Promise<{ chunks?: WhisperChunk[]; text: string }>;
  model: {
    (inputs: Record<string, Tensor>): Promise<{ logits: Tensor }>;
    generation_config: { decoder_start_token_id: number; lang_to_id: Record<string, number> };
  };
  processor: (audio: Float32Array) => Promise<{ input_features: Tensor }>;
}

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

/** The loudest 30 seconds, Whisper's window, which most likely holds speech. */
function findLoudestWindow(audio: Float32Array) {
  const windowLength = 30 * whisperSampleRate;
  if (audio.length <= windowLength) return audio;
  const blockLength = whisperSampleRate;
  const blockEnergies = new Float64Array(Math.ceil(audio.length / blockLength));
  for (let index = 0; index < audio.length; index += 1) {
    const value = audio[index] ?? 0;
    blockEnergies[Math.floor(index / blockLength)] += value * value;
  }
  const windowBlocks = windowLength / blockLength;
  let windowEnergy = 0;
  for (let block = 0; block < windowBlocks; block += 1) windowEnergy += blockEnergies[block] ?? 0;
  let loudestEnergy = windowEnergy;
  let loudestStart = 0;
  for (let block = windowBlocks; block < blockEnergies.length; block += 1) {
    windowEnergy += (blockEnergies[block] ?? 0) - (blockEnergies[block - windowBlocks] ?? 0);
    if (windowEnergy > loudestEnergy) {
      loudestEnergy = windowEnergy;
      loudestStart = block - windowBlocks + 1;
    }
  }
  const start = Math.min(loudestStart * blockLength, audio.length - windowLength);
  return audio.subarray(start, start + windowLength);
}

/**
 * Detects the spoken language the way Whisper does: one decoder step after the start token,
 * where the model predicts a language token. transformers.js otherwise assumes English.
 */
async function detectLanguage(transcriber: Transcriber, audio: Float32Array) {
  const config = transcriber.model.generation_config;
  const { input_features } = await transcriber.processor(findLoudestWindow(audio));
  const { logits } = await transcriber.model({
    decoder_input_ids: new Tensor(
      "int64",
      BigInt64Array.of(BigInt(config.decoder_start_token_id)),
      [1, 1],
    ),
    input_features,
  });
  // One position, so the logits are just the vocabulary's scores.
  const scores = logits.data as Float32Array;
  let language: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const [token, id] of Object.entries(config.lang_to_id)) {
    const score = scores[id] ?? Number.NEGATIVE_INFINITY;
    if (score > bestScore) {
      bestScore = score;
      language = token.slice(2, -2);
    }
  }
  return language;
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
  const language = await detectLanguage(transcriber, audio).catch(function assumeNothing() {
    return null;
  });
  const result = await transcriber(audio, {
    chunk_length_s: 30,
    language,
    return_timestamps: true,
    stride_length_s: 5,
    task: "transcribe",
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
