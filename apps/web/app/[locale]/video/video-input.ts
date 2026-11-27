import { MATROSKA, MP4, QTFF, WEBM } from "mediabunny";

/** The containers phones and browsers record; reading only these keeps the code small. */
export const videoInputFormats = [MP4, QTFF, WEBM, MATROSKA];

/** Location tags written by iPhones and other cameras, in QuickTime and MP4 metadata. */
export function isLocationTag(key: string) {
  return /xyz|loci|location|iso6709/i.test(key);
}
