export interface VideoEditorLabels {
  addCaption: string;
  cancel: string;
  captionBurned: string;
  captionMode: string;
  captionText: string;
  captionTrack: string;
  captions: string;
  chooseAnother: string;
  chooseVideo: string;
  cover: string;
  coverFooter: string;
  deleteCaption: string;
  description: string;
  details: string;
  downloadCaptions: string;
  dropActive: string;
  dropPrompt: string;
  duration: string;
  exactCuts: string;
  exactCutsFooter: string;
  export: string;
  exportFailed: string;
  exporting: string;
  fileSize: string;
  format: string;
  frameRate: string;
  framesPerSecond: string;
  generateCaptions: string;
  generateFooter: string;
  listening: string;
  noAudio: string;
  noCaptions: string;
  noSpeech: string;
  openFailed: string;
  pause: string;
  play: string;
  playhead: string;
  privacy: string;
  removeLocation: string;
  removeLocationFooter: string;
  resolution: string;
  saveCoverImage: string;
  saveVideo: string;
  selected: string;
  supported: string;
  title: string;
  tooLongToTranscribe: string;
  trim: string;
  trimEnd: string;
  trimStart: string;
  unsupported: string;
  useCurrentFrame: string;
  videoDescription: string;
  videoTitle: string;
}

export interface VideoCaption {
  /** Seconds in the original video's timeline. */
  end: number;
  id: string;
  start: number;
  text: string;
}

export type CaptionExportMode = "track" | "burned";

export interface VideoTrim {
  end: number;
  start: number;
}

export interface VideoDetails {
  description: string;
  removeLocation: boolean;
  title: string;
}

export interface VideoInfo {
  audioCodec: string | null;
  description: string;
  duration: number;
  frameRate: number | null;
  hasAudio: boolean;
  hasLocation: boolean;
  height: number;
  title: string;
  videoCodec: string | null;
  width: number;
}
