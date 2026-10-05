/** Documents are summarized into the reader's language as key points. */
export function getPdfSummaryOptions(locale: string): SummarizerOptions {
  return {
    expectedInputLanguages: [...new Set(["en", locale])],
    format: "plain-text",
    length: "medium",
    outputLanguage: locale,
    type: "key-points",
  };
}
