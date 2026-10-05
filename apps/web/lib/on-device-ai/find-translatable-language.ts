const minimumConfidence = 0.7;

let detectorPromise: Promise<LanguageDetectorSession> | null = null;

/** One detector serves every check on the page; if it cannot start, later checks give up too. */
function getDetector() {
  detectorPromise ??= LanguageDetector.create();
  return detectorPromise;
}

function getBaseLanguage(language: string) {
  return language.toLowerCase().split("-")[0] ?? language;
}

export interface TranslatableLanguage {
  /** False when the language pack still has to download, which needs a tap to start. */
  isReady: boolean;
  sourceLanguage: string;
}

/**
 * The language a text is written in when it differs from the reader's and the browser can
 * translate it on the device. Otherwise null.
 */
export async function findTranslatableLanguage(
  text: string,
  targetLanguage: string,
): Promise<TranslatableLanguage | null> {
  const detector = await getDetector();
  const [best] = await detector.detect(text);
  if (!best || best.confidence < minimumConfidence || best.detectedLanguage === "und") return null;
  const sourceLanguage = getBaseLanguage(best.detectedLanguage);
  if (sourceLanguage === getBaseLanguage(targetLanguage)) return null;
  const availability = await Translator.availability({ sourceLanguage, targetLanguage });
  if (availability === "unavailable") return null;
  return { isReady: availability === "available", sourceLanguage };
}
