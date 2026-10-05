import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Podcast, PodcastEpisode } from "./types";

import { messages } from "../../../messages/podcasts/en";

const aiLabels = {
  downloading: "Downloading {percent}",
  failed: "Failed",
  onDevice: "On device",
  working: "Working",
};

const navigation = vi.hoisted(function createNavigationMocks() {
  return {
    router: {
      back: vi.fn<() => void>(),
      prefetch: vi.fn<(href: string) => void>(),
      push: vi.fn<(href: string, options?: unknown) => void>(),
      replace: vi.fn<(href: string, options?: unknown) => void>(),
    },
    segments: [] as string[],
  };
});

vi.mock("next/navigation", function mockNavigation() {
  return {
    useParams: () => ({ show: navigation.segments[0] }),
    useRouter: () => navigation.router,
    useSearchParams: () => new URLSearchParams(),
    useSelectedLayoutSegments: () => navigation.segments,
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

/** A promise React can read synchronously, like one already resolved in a server payload. */
function createResolvedPromise<Value>(value: Value) {
  return Object.assign(Promise.resolve(value), { status: "fulfilled", value });
}

async function renderInShell(segments: string[], renderScreen: () => Promise<ReactNode>) {
  navigation.segments = segments;
  const { PodcastsShell } = await import("./podcasts-shell");
  const screenElement = await renderScreen();
  return render(
    <PodcastsShell aiLabels={aiLabels} locale="en" messages={messages}>
      {screenElement}
    </PodcastsShell>,
  );
}

async function renderShow() {
  return renderInShell(["a-thoughtful-show-123"], async function createShowScreen() {
    const { PodcastShowScreen } = await import("./podcast-show-screen");
    return <PodcastShowScreen show={createResolvedPromise({ podcast, episodes })} />;
  });
}

describe("Podcasts", function () {
  beforeEach(function resetDevice() {
    vi.resetModules();
    window.localStorage.clear();
    window.history.replaceState(null, "", "/podcasts/a-thoughtful-show-123");
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
    navigation.router.push.mockReset();
    navigation.router.replace.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("follows a show and counts it in the library", async function () {
    const { unmount } = await renderShow();

    fireEvent.click(await screen.findByRole("button", { name: "Follow" }));
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(JSON.parse(window.localStorage.getItem("podcast-library:v1") ?? "{}")).toMatchObject({
      version: 2,
      podcasts: [{ id: "123" }],
    });
    unmount();

    await renderInShell(["library"], async function createLibraryScreen() {
      const { PodcastsLibraryScreen } = await import("./podcasts-library-screen");
      return <PodcastsLibraryScreen view={null} />;
    });
    expect(await screen.findByRole("link", { name: /^Shows\s*1/ })).toHaveAttribute(
      "href",
      "/podcasts/library/shows",
    );
  });

  it("pushes an episode's own route with a forward slide", async function () {
    await renderShow();

    fireEvent.click(await screen.findByRole("link", { name: "The Newest Episode" }));

    expect(navigation.router.push).toHaveBeenCalledWith(
      "/podcasts/a-thoughtful-show-123/the-newest-episode-1001",
      {
        scroll: false,
        transitionTypes: ["ios-nav-forward"],
      },
    );
  });

  it("switches tabs in place and remembers each tab's screen", async function () {
    await renderShow();

    fireEvent.click(await screen.findByRole("button", { name: "Library" }));

    expect(navigation.router.push).toHaveBeenCalledWith("/podcasts/library", {
      scroll: false,
      transitionTypes: undefined,
    });
  });

  it("plays an episode in the mini player and remembers it", async function () {
    await renderShow();

    fireEvent.click(await screen.findByRole("button", { name: "Play: The Newest Episode" }));

    const miniPlayer = screen.getByRole("region", { name: "Now Playing" });
    expect(within(miniPlayer).getByText("The Newest Episode")).toBeInTheDocument();
    expect(within(miniPlayer).getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("podcast-now-playing:v1") ?? "{}")).toMatchObject(
      { episode: { id: "1001" } },
    );
  });

  it("keeps Now Playing open while the episode plays", async function () {
    let clock = 0;
    vi.spyOn(HTMLMediaElement.prototype, "currentTime", "get").mockImplementation(
      function readAdvancingTime() {
        clock += 0.25;
        return clock;
      },
    );
    await renderShow();

    fireEvent.click(await screen.findByRole("button", { name: "Play: The Newest Episode" }));
    fireEvent.click(screen.getByRole("button", { name: /^Open Now Playing/ }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
    await waitFor(function expectSheetToStayOpen() {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
