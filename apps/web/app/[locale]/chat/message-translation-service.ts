// Translates received messages on the device. Translator sessions are created once per
// language pair and reused for the whole conversation.

const translatorPromises = new Map<string, Promise<TranslatorSession>>();

export async function translateMessage(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  monitor?: (monitor: AICreateMonitor) => void,
) {
  const key = `${sourceLanguage}:${targetLanguage}`;
  let translatorPromise = translatorPromises.get(key);
  if (!translatorPromise) {
    translatorPromise = Translator.create({ sourceLanguage, targetLanguage, monitor });
    translatorPromises.set(key, translatorPromise);
    translatorPromise.catch(function forgetFailedTranslator() {
      translatorPromises.delete(key);
    });
  }
  const translator = await translatorPromise;
  return translator.translate(text);
}
