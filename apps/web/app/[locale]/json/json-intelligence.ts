import { readStreamedText } from "../../../lib/on-device-ai/on-device-ai-session";
import { getJsonQuestionOptions } from "./json-intelligence-options";

/** The on-device model's context is small; longer documents are cut and marked as such. */
const maximumJsonCharacters = 12_000;

interface JsonRequestContext {
  monitor: (monitor: AICreateMonitor) => void;
  signal: AbortSignal;
}

function describeDocument(json: string) {
  return json.length > maximumJsonCharacters
    ? `${json.slice(0, maximumJsonCharacters)}\n…(the document continues but was cut for length)`
    : json;
}

function createSession(
  locale: string,
  instructions: string,
  { monitor, signal }: JsonRequestContext,
) {
  return LanguageModel.create({
    ...getJsonQuestionOptions(locale),
    initialPrompts: [{ role: "system", content: instructions }],
    monitor,
    signal,
  });
}

/** Answers a question about the document, streaming the answer as it is written. */
export async function askAboutJson(
  json: string,
  question: string,
  locale: string,
  onText: (text: string) => void,
  context: JsonRequestContext,
) {
  const language = new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? "English";
  const session = await createSession(
    locale,
    `You answer questions about a JSON document. Base every answer only on the document, say so when it does not contain the answer, and keep answers short. Reply in ${language} as plain text without Markdown.`,
    context,
  );
  try {
    return await readStreamedText(
      session.promptStreaming(
        `JSON document:\n${describeDocument(json)}\n\nQuestion: ${question}`,
        {
          signal: context.signal,
        },
      ),
      onText,
    );
  } finally {
    session.destroy();
  }
}

/** Writes a JSON Schema for the document, with a description for each property. */
export async function generateJsonSchema(
  json: string,
  locale: string,
  context: JsonRequestContext,
) {
  const session = await createSession(
    locale,
    "You write JSON Schema (draft 2020-12) documents that describe JSON data. Include $schema, types, required properties, and a short description for each property.",
    context,
  );
  try {
    const response = await session.prompt(
      `Write a JSON Schema for this JSON document:\n${describeDocument(json)}`,
      { responseConstraint: { type: "object" }, signal: context.signal },
    );
    return JSON.stringify(JSON.parse(response), null, 2);
  } finally {
    session.destroy();
  }
}
