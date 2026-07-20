import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Podcast } from "./types";

import { messages as englishMessages } from "../../messages/podcasts/en";
import { savePodcastProgress } from "./podcast-progress";
import { PodcastsExplorer } from "./podcasts-explorer";

const navigationMocks = vi.hoisted(function createNavigationMocks() {
  return {
    push: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
    replace: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
  };
});

function MockImage({ alt }: { alt?: string }) {
  return <span data-image-alt={alt} />;
}

vi.mock("next/image", function mockNextImage() {
  return { default: MockImage };
});

vi.mock("next/navigation", function mockNavigation() {
  return { useRouter: () => navigationMocks };
});

const podcast: Podcast = {
  id: "123",
  title: "A thoughtful show",
  author: "A curious host",
  artworkUrl: "https://example.com/art.jpg",
  genre: "Technology",
  url: "https://example.com/show",
};

function getEnglishPodcastMessages() {
  return englishMessages;
}

describe("PodcastsExplorer", function () {
  beforeEach(function clearLibrary() {
    window.localStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(function loadMetadata() {});
    navigationMocks.push.mockClear();
    navigationMocks.replace.mockClear();
  });

  afterEach(function restoreMediaMethods() {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds a show to the device library and persists a versioned record", function () {
    const messages = getEnglishPodcastMessages();
    render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `${messages["Add"]}: ${podcast.title}` }));
    fireEvent.click(screen.getByRole("tab", { name: `${messages["Your library"]} (1)` }));

    expect(screen.getByRole("heading", { name: podcast.title })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("podcast-library:v1") ?? "{}")).toMatchObject({
      version: 2,
      podcasts: [{ id: podcast.id }],
    });
  });

  it("migrates the previous favorites record into the unified library", async function () {
    const messages = getEnglishPodcastMessages();
    window.localStorage.setItem(
      "podcast-library:v1",
      JSON.stringify({ version: 1, podcasts: [podcast], favoriteIds: [podcast.id] }),
    );
    render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );
    const libraryTab = await screen.findByRole("tab", { name: `${messages["Your library"]} (1)` });
    fireEvent.click(libraryTab);
    expect(screen.getByRole("heading", { name: podcast.title })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /favorites/i })).not.toBeInTheDocument();
    await waitFor(function waitForMigratedStorage() {
      expect(JSON.parse(window.localStorage.getItem("podcast-library:v1") ?? "{}")).toEqual({
        version: 2,
        podcasts: [podcast],
      });
    });
  });

  it("requests server-rendered typeahead results without a form submission", function () {
    vi.useFakeTimers();
    const messages = getEnglishPodcastMessages();
    render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    const searchInput = screen.getByRole("combobox", { name: messages["Search"] });
    fireEvent.change(searchInput, { target: { value: "thoughtful" } });
    expect(searchInput).toHaveValue("thoughtful");
    expect(navigationMocks.replace).not.toHaveBeenCalled();

    act(function finishSearchDebounce() {
      vi.advanceTimersByTime(180);
    });

    expect(searchInput).toHaveAttribute("name", "q");
    expect(navigationMocks.replace).toHaveBeenCalledWith("/podcasts?q=thoughtful", {
      scroll: false,
    });

    fireEvent.click(screen.getByRole("button", { name: messages["Clear search"] }));
    expect(searchInput).toHaveValue("");
    expect(navigationMocks.replace).toHaveBeenLastCalledWith("/podcasts", { scroll: false });
  });

  it("shows server-rendered suggestions and supports keyboard selection", function () {
    const messages = getEnglishPodcastMessages();
    render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery="thoughtful"
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    const searchInput = screen.getByRole("combobox", { name: messages["Search"] });
    const suggestion = screen.getByRole("option", { name: new RegExp(podcast.title) });
    expect(suggestion).toHaveAttribute("href", `/podcasts?podcast=${podcast.id}`);

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    expect(suggestion).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(navigationMocks.push).toHaveBeenCalledWith(`/podcasts?podcast=${podcast.id}`, {
      scroll: false,
    });
    expect(searchInput).toHaveValue("");
  });

  it("keeps the Base UI search field controlled when server props change", function () {
    const messages = getEnglishPodcastMessages();
    const consoleError = vi.spyOn(console, "error").mockImplementation(function ignoreError() {});
    const view = render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    view.rerender(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery="thoughtful"
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    expect(screen.getByRole("combobox", { name: messages["Search"] })).toHaveValue("thoughtful");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("exposes real links for shows, searches, and episodes", function () {
    const messages = getEnglishPodcastMessages();
    const episode = {
      id: "456",
      title: "A shareable episode",
      audioUrl: "https://example.com/episode.mp3",
      description: "An episode description",
      durationMilliseconds: 60_000,
      publishedAt: "2026-07-19T00:00:00.000Z",
    };
    const firstRender = render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery="science"
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    expect(screen.getByRole("link", { name: new RegExp(podcast.title) })).toHaveAttribute(
      "href",
      `/podcasts?podcast=${podcast.id}`,
    );
    expect(screen.getByRole("combobox", { name: messages["Search"] })).toHaveValue("science");
    firstRender.unmount();

    render(
      <PodcastsExplorer
        initialEpisodeId={episode.id}
        initialEpisodes={[episode]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={podcast}
        messages={messages}
        locale="en"
      />,
    );
    expect(screen.getByRole("link", { name: episode.title })).toHaveAttribute(
      "href",
      `/podcasts?podcast=${podcast.id}&episode=${episode.id}`,
    );
  });

  it("keeps client state while server-rendered podcast routes change", async function () {
    const messages = getEnglishPodcastMessages();
    const view = render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `${messages["Add"]}: ${podcast.title}` }));
    view.rerender(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[podcast]}
        initialQuery=""
        initialSelectedPodcast={podcast}
        messages={messages}
        locale="en"
      />,
    );

    expect(await screen.findByRole("heading", { name: podcast.title })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: `${messages["Your library"]} (1)` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: messages["Added"] })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: messages["Back to shows"] }));
    expect(navigationMocks.push).toHaveBeenCalledWith("/podcasts", { scroll: false });
  });

  it("loads metadata and restores the saved playback time after refresh", async function () {
    const messages = getEnglishPodcastMessages();
    const episode = {
      id: "resume-456",
      title: "A resumable episode",
      audioUrl: "https://example.com/resume.mp3",
      description: "An episode description",
      durationMilliseconds: 60_000,
      publishedAt: "2026-07-19T00:00:00.000Z",
    };
    savePodcastProgress(podcast, episode, 25, 60);
    const { container } = render(
      <PodcastsExplorer
        initialEpisodeId={episode.id}
        initialEpisodes={[episode]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={podcast}
        messages={messages}
        locale="en"
      />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();

    await waitFor(function waitForStoredPosition() {
      expect(audio).toHaveAttribute("preload", "metadata");
    });
    const seekControl = screen.getByRole("slider", {
      name: `${messages["Playback position"]}: ${episode.title}`,
    });
    await waitFor(function waitForRestoredPosition() {
      expect(seekControl).toHaveValue("25");
    });
    expect(seekControl).toHaveAttribute("max", "60");
    expect(screen.getByText("0:25 / 1:00")).toBeInTheDocument();
    fireEvent.loadedMetadata(audio as HTMLAudioElement);

    expect(audio?.currentTime).toBe(25);
    fireEvent.input(seekControl, { target: { value: "30" } });
    expect(audio?.currentTime).toBe(30);
    expect(screen.getByText("0:30 / 1:00")).toBeInTheDocument();

    const audioElement = audio as HTMLAudioElement;
    const player = screen.getByRole("region", {
      name: `${messages["Now playing"]}: ${episode.title}`,
    });
    const playMock = vi.spyOn(audioElement, "play").mockResolvedValue();
    const playButton = within(player).getByRole("button", { name: messages["Play"] });
    expect(playButton).toHaveAttribute("data-size", "icon-lg");
    expect(playButton).toHaveTextContent("▶");
    fireEvent.click(playButton);
    expect(playMock).toHaveBeenCalledOnce();

    Object.defineProperty(audioElement, "paused", { configurable: true, value: false });
    fireEvent.play(audioElement);
    const pauseMock = vi.spyOn(audioElement, "pause").mockImplementation(function pauseMedia() {});
    const pauseButton = within(player).getByRole("button", { name: messages["Pause"] });
    expect(pauseButton).toHaveAttribute("data-size", "icon-lg");
    expect(pauseButton).toHaveTextContent("❚❚");
    fireEvent.click(pauseButton);
    expect(pauseMock).toHaveBeenCalledOnce();
  });

  it("shows artwork and useful metadata on the podcast page", function () {
    const messages = getEnglishPodcastMessages();
    const detailedPodcast: Podcast = {
      ...podcast,
      episodeCount: 142,
      explicit: true,
      latestReleaseAt: "2026-07-19T12:00:00.000Z",
    };
    const { container } = render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={detailedPodcast}
        messages={messages}
        locale="en"
      />,
    );

    expect(
      container.querySelector(`[data-image-alt="${podcast.title} — ${messages["Cover art"]}"]`),
    ).toBeInTheDocument();
    expect(screen.getByText(`142 ${messages["episodes"]}`)).toBeInTheDocument();
    expect(screen.getByText(messages["Explicit"])).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages["View on Apple Podcasts"] })).toHaveAttribute(
      "href",
      podcast.url,
    );
  });

  it("confirms before removing one episode from in progress", async function () {
    const messages = getEnglishPodcastMessages();
    const episode = {
      id: "remove-456",
      title: "Keep my place",
      audioUrl: "https://example.com/remove.mp3",
      description: "An episode description",
      durationMilliseconds: 60_000,
      publishedAt: "2026-07-19T00:00:00.000Z",
    };
    savePodcastProgress(podcast, episode, 25, 60);
    render(
      <PodcastsExplorer
        initialEpisodeId=""
        initialEpisodes={[]}
        initialPodcasts={[]}
        initialQuery=""
        initialSelectedPodcast={null}
        messages={messages}
        locale="en"
      />,
    );

    const progressTab = await screen.findByRole("tab", { name: `${messages["In progress"]} (1)` });
    fireEvent.click(progressTab);
    const removeButton = screen.getByRole("button", {
      name: `${messages["Remove from in progress"]}: ${episode.title}`,
    });
    fireEvent.click(removeButton);
    expect(
      screen.getByRole("heading", { name: messages["Remove saved progress?"] }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: messages["Cancel"] }));
    expect(screen.getByRole("heading", { name: episode.title })).toBeInTheDocument();

    fireEvent.click(removeButton);
    fireEvent.click(screen.getByRole("button", { name: messages["Remove"] }));

    await waitFor(function waitForRemovedProgress() {
      expect(screen.queryByRole("heading", { name: episode.title })).not.toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: `${messages["In progress"]} (0)` }),
      ).toBeInTheDocument();
    });
  });
});
