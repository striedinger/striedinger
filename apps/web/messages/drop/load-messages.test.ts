import { describe, expect, it } from "vitest";

import { loadDropMessages } from "./load-messages";

const translatedLocales = ["de", "es", "fr", "it", "ja", "pt", "zh"] as const;

describe("Drop translations", function () {
  it.each(translatedLocales)("loads translated interactive labels for %s", async function (locale) {
    const messages = await loadDropMessages(locale);

    expect(messages["Copy invite link"]).not.toBe("Copy invite link");
    expect(messages["Transfer failed"]).not.toBe("Transfer failed");
    expect(messages.Retry).not.toBe("Retry");
  });
});
