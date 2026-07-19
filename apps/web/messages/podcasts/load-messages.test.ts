import { describe, expect, it } from "vitest";

import { loadPodcastMessages } from "./load-messages";

const translatedLocales = ["de", "es", "fr", "it", "ja", "pt", "zh"] as const;

describe("Podcast translations", function () {
  it.each(translatedLocales)("loads translated interface labels for %s", async function (locale) {
    const messages = await loadPodcastMessages(locale);

    expect(messages.Search).not.toBe("Search");
    expect(messages["Local library"]).not.toBe("Local library");
    expect(messages["Remove saved progress?"]).not.toBe("Remove saved progress?");
  });
});
