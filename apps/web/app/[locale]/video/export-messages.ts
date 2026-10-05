import type { CaptionExportMode, VideoCaption, VideoDetails, VideoTrim } from "./types";

export interface ExportRequest {
  captionMode: CaptionExportMode;
  captions: VideoCaption[];
  cover: Blob | null;
  details: VideoDetails;
  exactCuts: boolean;
  file: File;
  kind: "export";
  outputName: string;
  trim: VideoTrim;
}

export type ExportCommand = ExportRequest | { kind: "cancel" };

export type ExportReply =
  | { kind: "progress"; progress: number }
  | { file: File; kind: "done" }
  | { kind: "canceled" }
  | { kind: "error" };
