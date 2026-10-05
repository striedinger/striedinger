import type { VideoCaption } from "./types";

export interface TranscriptionRequest {
  end: number;
  file: File;
  start: number;
}

export type TranscriptionReply =
  | { kind: "download"; progress: number }
  | { kind: "transcribing" }
  | { captions: VideoCaption[]; kind: "done" }
  | { kind: "error"; reason: "no-audio" | "too-long" | "failed" };

/** Longer stretches would hold too much audio in memory on a phone. */
export const maximumTranscriptionSeconds = 20 * 60;

/** About what the first run downloads: the runtime plus Whisper tiny's encoder and decoder. */
export const whisperDownloadMegabytes = 45;
