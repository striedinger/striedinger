/** Translator sessions handle paragraphs best, so long text is translated in pieces. */
const maximumChunkCharacters = 1_000;

function splitIntoChunks(text: string) {
  const chunks: string[] = [];
  let chunk = "";
  for (const paragraph of text.split(/\n+/)) {
    if (chunk && chunk.length + paragraph.length > maximumChunkCharacters) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk = chunk ? `${chunk}\n${paragraph}` : paragraph;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

/** Translates paragraph by paragraph, reporting the translation so far after each piece. */
export async function translateLongText(
  translator: TranslatorSession,
  text: string,
  onText: (text: string) => void,
  signal: AbortSignal,
) {
  let translation = "";
  for (const chunk of splitIntoChunks(text)) {
    signal.throwIfAborted();
    // oxlint-disable-next-line no-await-in-loop -- Pieces translate in order so the text reads top to bottom.
    const translatedChunk = await translator.translate(chunk, { signal });
    translation = translation ? `${translation}\n${translatedChunk}` : translatedChunk;
    onText(translation);
  }
  return translation;
}
