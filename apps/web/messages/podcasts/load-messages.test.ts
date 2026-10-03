import { describe, expect, it } from "vitest";

import { loadPodcastMessages } from "./load-messages";

const translatedLocales = ["de", "es", "fr", "it", "ja", "pt", "zh"] as const;

describe("Podcast translations", function () {
  it.each(translatedLocales)("loads translated interface labels for %s", async function (locale) {
    const messages = await loadPodcastMessages(locale);

    expect(messages.Library).not.toBe("Library");
    expect(messages["Up Next"]).not.toBe("Up Next");
    expect(messages["Sleep Timer"]).not.toBe("Sleep Timer");
  });
});
