export interface VideoEditorLabels {
  about: string;
  addCaption: string;
  addLogo: string;
  cancel: string;
  captionBurned: string;
  captionMode: string;
  captions: string;
  captionText: string;
  captionTrack: string;
  chooseAnother: string;
  chooseVideo: string;
  cover: string;
  coverFooter: string;
  deleteCaption: string;
  description: string;
  details: string;
  detectedLanguage: string;
  downloadCaptions: string;
  dropActive: string;
  dropPrompt: string;
  duration: string;
  exactCuts: string;
  exactCutsFooter: string;
  export: string;
  exportFailed: string;
  exporting: string;
  exportSize: string;
  fileSize: string;
  format: string;
  frameRate: string;
  framesPerSecond: string;
  generateCaptions: string;
  generateFooter: string;
  listening: string;
  logoInvalid: string;
  noAudio: string;
  noCaptions: string;
  noSpeech: string;
  openFailed: string;
  original: string;
  pause: string;
  play: string;
  playhead: string;
  privacy: string;
  removeLocation: string;
  removeLocationFooter: string;
  removeLogo: string;
  replaceLogo: string;
  resolution: string;
  saveCoverImage: string;
  saveVideo: string;
  selected: string;
  sizeLarge: string;
  sizeMedium: string;
  sizeSmall: string;
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
  watermark: string;
  watermarkFixed: string;
  watermarkFooter: string;
  watermarkMotion: string;
  watermarkMoving: string;
  watermarkOpacity: string;
  watermarkPlaceholder: string;
  watermarkSize: string;
  watermarkText: string;
}

export interface VideoCaption {
  /** Seconds in the original video's timeline. */
  end: number;
  id: string;
  start: number;
  text: string;
}

export type CaptionExportMode = "track" | "burned";

export type WatermarkMotion = "hop" | "fixed";
export type WatermarkSize = "small" | "medium" | "large";

/** A logo redrawn as a small PNG, so whatever was uploaded is bounded and inert. */
export interface WatermarkLogo {
  blob: Blob;
  height: number;
  /** An object URL of `blob` for the preview, released when the logo is replaced. */
  url: string;
  width: number;
}

export interface VideoWatermark {
  logo: WatermarkLogo | null;
  motion: WatermarkMotion;
  opacity: number;
  size: WatermarkSize;
  text: string;
}

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
  /** The audio track's average bitrate in bits per second, when known. */
  audioBitrate: number | null;
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
