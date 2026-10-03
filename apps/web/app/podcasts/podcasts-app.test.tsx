import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Podcast, PodcastEpisode } from "./types";

import { messages } from "../../messages/podcasts/en";

const navigationMocks = vi.hoisted(function createNavigationMocks() {
  return {
    back: vi.fn<() => void>(),
    push: vi.fn<(href: string) => void>(),
    replace: vi.fn<(href: string) => void>(),
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return {
    usePathname: () => "/podcasts",
    useRouter: () => navigationMocks,
    useSearchParams: () => new URLSearchParams(window.location.search),
  };
});

function MockImage({ alt }: { alt?: string }) {
  return <span data-image-alt={alt} />;
}

vi.mock("next/image", function mockNextImage() {
  return { default: MockImage };
});

const podcast: Podcast = {
  id: "123",
  title: "A Thoughtful Show",
  author: "A Curious Host",
  artworkUrl: "https://example.com/art.jpg",
  genre: "Technology",
  url: "https://podcasts.apple.com/podcast/id123",
};

const episodes: PodcastEpisode[] = [
  {
    id: "1001",
    title: "The Newest Episode",
    audioUrl: "https://example.com/1001.mp3",
    description: "A conversation about careful software.",
    durationMilliseconds: 45 * 60_000,
    publishedAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "1000",
    title: "The First Episode",
    audioUrl: "https://example.com/1000.mp3",
    description: "Where it all began.",
    durationMilliseconds: 30 * 60_000,
    publishedAt: "2026-09-24T10:00:00.000Z",
  },
];

async function renderPodcasts(search = "") {
  window.history.replaceState(null, "", `/podcasts${search}`);
  const { PodcastsApp } = await import("./podcasts-app");
  return render(
    <PodcastsApp
      locale="en"
      messages={messages}
      popular={[podcast]}
      searchFailed={false}
      searchQuery=""
      searchResults={[]}
      show={{ podcast, episodes }}
    />,
  );
}

describe("PodcastsApp", function () {
  beforeEach(function resetDevice() {
    vi.resetModules();
    window.localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function skipLoading() {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
      function startPlaying(this: HTMLMediaElement) {
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      },
    );
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      function stopPlaying(this: HTMLMediaElement) {
        this.dispatchEvent(new Event("pause"));
      },
    );
  });

  afterEach(function restoreMocks() {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("follows a show and lists it in the library", async function () {
    await renderPodcasts("?podcast=123");

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(JSON.parse(window.localStorage.getItem("podcast-library:v1") ?? "{}")).toMatchObject({
      version: 2,
      podcasts: [{ id: "123" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    const showsRow = screen.getByRole("button", { name: /^Shows\s*1/ });
    expect(showsRow).toBeInTheDocument();
  });

  it("plays an episode in the mini player and remembers it", async function () {
    await renderPodcasts("?podcast=123");

    fireEvent.click(screen.getByRole("button", { name: "Play: The Newest Episode" }));

    const miniPlayer = screen.getByRole("region", { name: "Now Playing" });
    expect(within(miniPlayer).getByText("The Newest Episode")).toBeInTheDocument();
    expect(within(miniPlayer).getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("podcast-now-playing:v1") ?? "{}")).toMatchObject(
      {
        episode: { id: "1001" },
      },
    );
  });

  it("queues episodes with Play Next and shows them in Up Next on Home", async function () {
    await renderPodcasts("?podcast=123");

    fireEvent.click(screen.getByRole("button", { name: "Play: The Newest Episode" }));
    fireEvent.click(screen.getByRole("button", { name: "More: The First Episode" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Play Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    const upNext = screen.getByRole("region", { name: "Up Next" });
    expect(within(upNext).getByText("The Newest Episode")).toBeInTheDocument();
    expect(within(upNext).getByText("The First Episode")).toBeInTheDocument();
  });
});
