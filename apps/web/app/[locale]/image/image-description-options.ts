/** Descriptions look at the image and are written in the visitor's language. */
export function getImageDescriptionOptions(locale: string): LanguageModelOptions {
  return {
    expectedInputs: [{ type: "image" }, { type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: [locale] }],
  };
}
