import type {
  CaptionExportMode,
  VideoCaption,
  VideoDetails,
  VideoTrim,
  WatermarkMotion,
  WatermarkSize,
} from "./types";

export interface ExportRequest {
  /** The captions' spoken language as a Whisper language code, when it was detected. */
  captionLanguage: string | null;
  captionMode: CaptionExportMode;
  captions: VideoCaption[];
  cover: Blob | null;
  details: VideoDetails;
  exactCuts: boolean;
  file: File;
  kind: "export";
  outputName: string;
  /** Re-encodes at this size and bitrate for sharing, or keeps the original when `null`. */
  resize: { bitrate: number; height: number; width: number } | null;
  trim: VideoTrim;
  /** A watermark burned into every frame, or `null` for none. */
  watermark: {
    logo: Blob | null;
    motion: WatermarkMotion;
    opacity: number;
    size: WatermarkSize;
    text: string;
  } | null;
}

export type ExportCommand = ExportRequest | { kind: "cancel" };

export type ExportReply =
  | { kind: "progress"; progress: number }
  | { file: File; kind: "done" }
  | { kind: "canceled" }
  | { kind: "error" };
