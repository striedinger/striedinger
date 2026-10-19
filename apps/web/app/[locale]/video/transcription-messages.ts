import type { VideoCaption } from "./types";

export interface TranscriptionRequest {
  end: number;
  file: File;
  /** Identifies the job, so replies to an earlier one are never taken for this one's. */
  id: string;
  kind: "transcribe";
  start: number;
}

export type TranscriptionCommand = TranscriptionRequest | { id: string; kind: "cancel" };

export type TranscriptionReply = { id: string } & (
  | { kind: "download"; progress: number }
  | { kind: "transcribing" }
  | { captions: VideoCaption[]; kind: "done"; language: string | null }
  | { kind: "error"; reason: "no-audio" | "too-long" | "failed" }
);

/** Longer stretches would hold too much audio in memory on a phone. */
export const maximumTranscriptionSeconds = 20 * 60;

/** About what the first run downloads: the runtime plus Whisper tiny's encoder and decoder. */
export const whisperDownloadMegabytes = 45;
