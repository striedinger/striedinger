// Translates received messages on the device. Translator sessions are created once per
// language pair and reused for the whole conversation.

const translatorPromises = new Map<string, Promise<TranslatorSession>>();
let retainCount = 0;

/**
 * Keeps translator sessions alive while a translated message is on screen. When the last one
 * goes, as when leaving the chat, the sessions and the model memory they hold are released.
 */
export function retainTranslators() {
  retainCount += 1;
  return function releaseTranslators() {
    retainCount -= 1;
    if (retainCount > 0) return;
    const sessions = [...translatorPromises.values()];
    translatorPromises.clear();
    for (const session of sessions) {
      session
        .then(function destroySession(translator) {
          translator.destroy();
          return undefined;
        })
        .catch(function ignoreFailedSession() {
          return undefined;
        });
    }
  };
}

export async function translateMessage(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  monitor?: (monitor: AICreateMonitor) => void,
) {
  const key = `${sourceLanguage}:${targetLanguage}`;
  let translatorPromise = translatorPromises.get(key);
  if (!translatorPromise) {
    translatorPromise = Translator.create(
      monitor ? { sourceLanguage, targetLanguage, monitor } : { sourceLanguage, targetLanguage },
    );
    translatorPromises.set(key, translatorPromise);
    translatorPromise.catch(function forgetFailedTranslator() {
      translatorPromises.delete(key);
    });
  }
  const translator = await translatorPromise;
  return translator.translate(text);
}
