const maximumFileNameLength = 255;
const fallbackFileName = "file";
// Control, format (bidi overrides, zero-width characters), and line or paragraph separators
// let a peer disguise a name such as "report‮fdp.exe" as "reportexe.pdf".
const invisibleCharacters = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
// Collapsed so padding cannot push the real extension out of the truncated display.
const whitespaceRuns = /\s+/gu;

/** Makes a peer-provided file name safe to display and to suggest as a download name. */
export function sanitizeFileName(name: string) {
  const visibleName = name.replace(invisibleCharacters, "").replace(whitespaceRuns, " ").trim();
  const truncatedName = Array.from(visibleName).slice(0, maximumFileNameLength).join("").trim();

  return truncatedName.length > 0 ? truncatedName : fallbackFileName;
}
