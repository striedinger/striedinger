/** The availability options for each request, shared by the probe and the session. */
export function getSvgEditOptions(locale: string): LanguageModelOptions {
  return {
    // Requests arrive in the visitor's language; the SVG itself is code.
    expectedInputs: [{ type: "text", languages: ["en", locale] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  };
}

export function getSvgDescribeOptions(locale: string): LanguageModelOptions {
  return {
    expectedInputs: [{ type: "image" }, { type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: [locale] }],
  };
}
