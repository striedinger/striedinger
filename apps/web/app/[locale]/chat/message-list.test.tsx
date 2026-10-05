import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisibleChatMessage } from "./types";

import { MessageList } from "./message-list";
import { testChatLabels } from "./test-labels";

const scrollToMock = vi.fn<(options?: ScrollToOptions) => void>();

beforeAll(function addScrollToToJSDOM() {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollToMock,
  });
});

beforeEach(function resetScrollCalls() {
  scrollToMock.mockClear();
});

function renderMessageList(messages: VisibleChatMessage[]) {
  return render(
    <MessageList
      emptyDescription="You’re Silver Finch"
      header={<h1>Nearby Chat</h1>}
      labels={testChatLabels}
      locale="en"
      messages={messages}
    />,
  );
}

function getScrollView() {
  const scrollView = screen.getByRole("log", { name: "Messages" }).closest("[data-ios-scroll]");
  if (!(scrollView instanceof HTMLElement)) throw new Error("Missing scroll view");
  return scrollView;
}

describe("message list", function () {
  it("translates received messages written in another language on the device", async function () {
    const translate = vi
      .fn<(text: string) => Promise<string>>()
      .mockResolvedValue("See you at the park");
    vi.stubGlobal("LanguageDetector", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("available"),
      create: vi.fn<() => Promise<object>>().mockResolvedValue({
        destroy() {},
        detect: vi
          .fn<() => Promise<object[]>>()
          .mockResolvedValue([{ confidence: 0.96, detectedLanguage: "es" }]),
      }),
    });
    vi.stubGlobal("Translator", {
      availability: vi.fn<() => Promise<string>>().mockResolvedValue("available"),
      create: vi.fn<() => Promise<object>>().mockResolvedValue({ destroy() {}, translate }),
    });

    renderMessageList([
      {
        author: "Quiet Otter",
        id: "spanish",
        isOwn: false,
        sentAt: 1_721_000_000_000,
        text: "Nos vemos en el parque",
      },
      {
        author: "Silver Finch",
        id: "own",
        isOwn: true,
        sentAt: 1_721_000_001_000,
        text: "Hasta luego, amigos míos",
      },
    ]);

    expect(await screen.findByText("See you at the park")).toBeInTheDocument();
    expect(screen.getByText("Translated from Spanish")).toBeInTheDocument();
    expect(translate).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("uses local ownership metadata instead of trusting the author name", function () {
    renderMessageList([
      {
        author: "Quiet Otter",
        id: "remote-message",
        isOwn: false,
        sentAt: 1_721_000_000_000,
        text: "I copied your alias",
      },
    ]);

    expect(screen.getByText("Quiet Otter")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  it("names the sender of every message for assistive technology", function () {
    renderMessageList([
      {
        author: "Quiet Otter",
        id: "first",
        isOwn: false,
        sentAt: 1_721_000_000_000,
        text: "first",
      },
      {
        author: "Quiet Otter",
        id: "second",
        isOwn: false,
        sentAt: 1_721_000_001_000,
        text: "second",
      },
      {
        author: "Silver Finch",
        id: "reply",
        isOwn: true,
        sentAt: 1_721_000_002_000,
        text: "reply",
      },
    ]);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Quiet Otter");
    expect(items[1]).toHaveTextContent("Quiet Otter");
    expect(items[2]).toHaveTextContent("You");
  });

  it("shows an empty state while keeping the live log mounted", function () {
    renderMessageList([]);

    expect(screen.getByText("No messages yet")).toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Messages" })).toBeEmptyDOMElement();
  });

  it("exposes new messages as a log and reveals the latest entry", function () {
    renderMessageList([
      {
        author: "Silver Finch",
        id: "local-message",
        isOwn: true,
        sentAt: 1_721_000_000_000,
        text: "hello nearby",
      },
    ]);

    const log = screen.getByRole("log", { name: "Messages" });
    expect(log).toHaveAttribute("aria-relevant", "additions");
    expect(scrollToMock).toHaveBeenCalledWith({ top: getScrollView().scrollHeight });
  });

  it("does not move the viewport when someone is reading older messages", function () {
    const firstMessage = {
      author: "Silver Finch",
      id: "first-message",
      isOwn: false,
      sentAt: 1_721_000_000_000,
      text: "first",
    };
    const view = renderMessageList([firstMessage]);
    const scrollView = getScrollView();
    Object.defineProperties(scrollView, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 100 },
    });
    fireEvent.scroll(scrollView);
    scrollToMock.mockClear();

    view.rerender(
      <MessageList
        emptyDescription="You’re Silver Finch"
        header={<h1>Nearby Chat</h1>}
        labels={testChatLabels}
        locale="en"
        messages={[
          firstMessage,
          {
            author: "Quiet Otter",
            id: "second-message",
            isOwn: false,
            sentAt: 1_721_000_001_000,
            text: "second",
          },
        ]}
      />,
    );

    expect(scrollToMock).not.toHaveBeenCalled();
  });
});
