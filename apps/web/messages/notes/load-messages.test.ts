import { describe, expect, it } from "vitest";

import { loadNotesMessages } from "./load-messages";

const translatedLocales = ["de", "es", "fr", "it", "ja", "pt", "zh"] as const;

describe("Notes translations", function () {
  it.each(translatedLocales)("loads translated interface labels for %s", async function (locale) {
    const messages = await loadNotesMessages(locale);

    expect(messages.Folders).not.toBe("Folders");
    expect(messages["Recently Deleted"]).not.toBe("Recently Deleted");
    expect(messages.Checklist).not.toBe("Checklist");
  });
});
