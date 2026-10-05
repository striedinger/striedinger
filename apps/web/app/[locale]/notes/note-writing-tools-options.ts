// The availability options for each writing tool, shared by the probes and the sessions.

export function getProofreaderOptions(locale: string): ProofreaderOptions {
  return { expectedInputLanguages: [locale] };
}

export function getRewriterOptions(locale: string): RewriterOptions {
  return { expectedInputLanguages: [locale], format: "plain-text", outputLanguage: locale };
}

export function getSummarizerOptions(locale: string): SummarizerOptions {
  return {
    expectedInputLanguages: [locale],
    format: "plain-text",
    outputLanguage: locale,
    type: "key-points",
  };
}
