/** Episode descriptions are summarized into the listener's language. */
export function getEpisodeSummaryOptions(locale: string): SummarizerOptions {
  return {
    expectedInputLanguages: [...new Set(["en", locale])],
    format: "plain-text",
    length: "short",
    outputLanguage: locale,
    type: "key-points",
  };
}

/** Descriptions shorter than this already read as a summary. */
export const minimumSummarizedCharacters = 280;
