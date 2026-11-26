const maximumFileNameLength = 255;
const fallbackFileName = "file";
const invisibleCharacters = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
const whitespaceRuns = /\s+/gu;

/** Makes a peer-provided file name safe to display and to suggest as a download name. */
export function sanitizeFileName(name: string) {
  const visibleName = name.replace(invisibleCharacters, "").replace(whitespaceRuns, " ").trim();
  const truncatedName = Array.from(visibleName).slice(0, maximumFileNameLength).join("").trim();

  return truncatedName.length > 0 ? truncatedName : fallbackFileName;
}
