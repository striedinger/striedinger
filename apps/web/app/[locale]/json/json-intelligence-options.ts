/** Questions arrive in the visitor's language, and answers come back in it. */
export function getJsonQuestionOptions(locale: string): LanguageModelOptions {
  return {
    expectedInputs: [{ type: "text", languages: ["en", locale] }],
    expectedOutputs: [{ type: "text", languages: [locale] }],
  };
}
