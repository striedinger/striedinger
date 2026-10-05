import { defineOnDeviceAiProbe, hasOnDeviceAi } from "./use-on-device-ai";

/**
 * Translating text in an unknown language needs on-device detection and translation. The
 * detector runs without a tap, so it must already be installed: browsers only download
 * models after a tap.
 */
export const translationProbe = defineOnDeviceAiProbe(
  "LanguageDetector",
  "translation",
  async function checkTranslation() {
    if (!hasOnDeviceAi("Translator")) return "unavailable";
    const availability = await LanguageDetector.availability();
    return availability === "available" ? availability : "unavailable";
  },
);
