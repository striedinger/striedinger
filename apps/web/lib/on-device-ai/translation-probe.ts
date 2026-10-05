import { defineOnDeviceAiProbe, hasOnDeviceAi } from "./use-on-device-ai";

/** Translating text in an unknown language needs on-device detection and translation. */
export const translationProbe = defineOnDeviceAiProbe(
  "LanguageDetector",
  "translation",
  function checkTranslation() {
    return hasOnDeviceAi("Translator")
      ? LanguageDetector.availability()
      : Promise.resolve<AIAvailability>("unavailable");
  },
);
