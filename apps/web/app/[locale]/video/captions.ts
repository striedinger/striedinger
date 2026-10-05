import type { VideoCaption, VideoTrim } from "./types";

/** New captions last this long unless the next caption starts sooner. */
const defaultCaptionSeconds = 3;

export function sortCaptions(captions: readonly VideoCaption[]) {
  return captions.toSorted(function compareStarts(first, second) {
    return first.start - second.start;
  });
}

/** The caption shown at a moment in the original video, if any. */
export function findCaptionAt(captions: readonly VideoCaption[], time: number) {
  return captions.find(function isShowing(caption) {
    return time >= caption.start && time < caption.end;
  });
}

/** A caption starting at the playhead that ends before the next one begins. */
export function createCaptionAt(
  captions: readonly VideoCaption[],
  time: number,
  duration: number,
): VideoCaption {
  const nextStart = sortCaptions(captions).find(function startsLater(caption) {
    return caption.start > time;
  })?.start;
  const end = Math.min(time + defaultCaptionSeconds, nextStart ?? duration, duration);
  return { end: end > time ? end : time + 0.1, id: crypto.randomUUID(), start: time, text: "" };
}

/** `m:ss.t`, the precision the trim and caption controls work at. */
export function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds - minutes * 60;
  const tenths = Math.floor(remainder * 10) / 10;
  return `${minutes}:${tenths.toFixed(1).padStart(4, "0")}`;
}

function formatVttTimestamp(seconds: number) {
  const totalMilliseconds = Math.round(Math.max(0, seconds) * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const secondsPart = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

/**
 * The captions inside the trimmed range as a WebVTT file, timed from the trim start so they
 * line up with the exported video.
 */
export function captionsToWebVtt(captions: readonly VideoCaption[], trim: VideoTrim) {
  const cues = sortCaptions(captions).flatMap(function toCue(caption) {
    const text = caption.text.trim();
    const start = Math.max(caption.start, trim.start);
    const end = Math.min(caption.end, trim.end);
    if (!text || end <= start) return [];
    return [
      `${formatVttTimestamp(start - trim.start)} --> ${formatVttTimestamp(end - trim.start)}\n${text.replace(/-->/g, "→")}`,
    ];
  });
  return `WEBVTT\n\n${cues.join("\n\n")}${cues.length > 0 ? "\n" : ""}`;
}

/** About two lines of subtitles; longer captions are split so each stays readable. */
const maximumCaptionCharacters = 84;

/**
 * Splits a long caption at sentence and clause breaks, or between words, giving each piece a
 * share of the time proportional to its length.
 */
export function splitLongCaption(caption: VideoCaption): VideoCaption[] {
  const text = caption.text.trim();
  if (text.length <= maximumCaptionCharacters) return [caption];
  const phrases = text.match(/[^.!?,;:]+[.!?,;:]*\s*/g) ?? [text];
  const pieces: string[] = [];
  let piece = "";
  for (const phrase of phrases.flatMap(splitLongPhrase)) {
    if (piece && (piece + phrase).trim().length > maximumCaptionCharacters) {
      pieces.push(piece.trim());
      piece = "";
    }
    piece += phrase;
  }
  if (piece.trim()) pieces.push(piece.trim());
  const totalLength = pieces.reduce(function addLength(sum, part) {
    return sum + part.length;
  }, 0);
  let start = caption.start;
  return pieces.map(function toCaption(part, index) {
    const end =
      index === pieces.length - 1
        ? caption.end
        : start + ((caption.end - caption.start) * part.length) / totalLength;
    const result = { end, id: `${caption.id}-${index}`, start, text: part };
    start = end;
    return result;
  });
}

/** Breaks a phrase with no punctuation between words so no piece exceeds the limit. */
function splitLongPhrase(phrase: string) {
  if (phrase.length <= maximumCaptionCharacters) return [phrase];
  const parts: string[] = [];
  let part = "";
  for (const word of phrase.split(/(?<=\s)/)) {
    if (part && (part + word).length > maximumCaptionCharacters) {
      parts.push(part);
      part = "";
    }
    part += word;
  }
  if (part) parts.push(part);
  return parts;
}
