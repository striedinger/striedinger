import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageList } from "./message-list";

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

describe("message list", function () {
  it("uses local ownership metadata instead of trusting the author name", function () {
    render(
      <MessageList
        messages={[
          {
            author: "Quiet Otter",
            id: "remote-message",
            isOwn: false,
            sentAt: 1_721_000_000_000,
            text: "I copied your alias",
          },
        ]}
      />,
    );

    expect(screen.getByText("Quiet Otter")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  it("exposes new messages as a log and reveals the latest entry", function () {
    render(
      <MessageList
        messages={[
          {
            author: "Silver Finch",
            id: "local-message",
            isOwn: true,
            sentAt: 1_721_000_000_000,
            text: "hello nearby",
          },
        ]}
      />,
    );

    const log = screen.getByRole("log", { name: "Messages" });
    expect(log).toHaveAttribute("aria-relevant", "additions");
    expect(scrollToMock).toHaveBeenCalledWith({ top: log.scrollHeight });
  });

  it("does not move the viewport when someone is reading older messages", function () {
    const firstMessage = {
      author: "Silver Finch",
      id: "first-message",
      isOwn: false,
      sentAt: 1_721_000_000_000,
      text: "first",
    };
    const view = render(<MessageList messages={[firstMessage]} />);
    const log = screen.getByRole("log", { name: "Messages" });
    Object.defineProperties(log, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 100 },
    });
    fireEvent.scroll(log);
    scrollToMock.mockClear();

    view.rerender(
      <MessageList
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
