import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { messages } from "../../../messages/podcasts/en";
import { EpisodeIntelligence } from "./episode-intelligence";

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  working: "Working",
};

const longDescription = "Hoy hablamos de cómo empezar un huerto en casa. ".repeat(8);

afterEach(function restoreGlobals() {
  vi.unstubAllGlobals();
});

describe("EpisodeIntelligence", function () {
  it("offers a translation for a description in another language", async function () {
    vi.stubGlobal("LanguageDetector", {
      create: vi.fn<() => Promise<object>>().mockResolvedValue({
        destroy() {},
        detect: vi
          .fn<() => Promise<object[]>>()
          .mockResolvedValue([{ confidence: 0.98, detectedLanguage: "es" }]),
      }),
    });
    vi.stubGlobal("Translator", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("downloadable"),
      create: vi.fn<() => Promise<object>>().mockResolvedValue({
        destroy() {},
        translate: vi.fn<() => Promise<string>>().mockResolvedValue("Today we talk about gardens."),
      }),
    });
    render(
      <EpisodeIntelligence
        aiLabels={aiLabels}
        canSummarize={false}
        canTranslate
        description={longDescription}
        locale="en"
        messages={messages}
      />,
    );

    const translate = await screen.findByRole("button", { name: "Translate from Spanish" });
    expect(screen.queryByRole("button", { name: "Key Points" })).not.toBeInTheDocument();
    await act(async function translateDescription() {
      fireEvent.click(translate);
    });

    expect(screen.getByRole("heading", { name: "Translated from Spanish" })).toBeInTheDocument();
    expect(screen.getByText("Today we talk about gardens.")).toBeInTheDocument();
  });

  it("renders nothing for short descriptions it cannot translate", function () {
    const { container } = render(
      <EpisodeIntelligence
        aiLabels={aiLabels}
        canSummarize
        canTranslate={false}
        description="A short teaser."
        locale="en"
        messages={messages}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
