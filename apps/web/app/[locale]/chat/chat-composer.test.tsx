import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatComposer } from "./chat-composer";
import { testChatLabels } from "./test-labels";

function createSendHandler() {
  return vi.fn<(text: string) => Promise<boolean>>(async function send() {
    return true;
  });
}

describe("chat composer", function () {
  it("enables sending only once there is text to send", function () {
    render(<ChatComposer disabled={false} labels={testChatLabels} onSend={createSendHandler()} />);
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "   " },
    });
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
      target: { value: "hello" },
    });
    expect(sendButton).toBeEnabled();
  });

  it("sends with Enter and clears the field", async function () {
    const onSend = createSendHandler();
    render(<ChatComposer disabled={false} labels={testChatLabels} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(field, { target: { value: "hello nearby" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("hello nearby");
    await waitFor(function expectClearedField() {
      expect(field).toHaveValue("");
    });
  });

  it("keeps Shift+Enter for a new line", function () {
    const onSend = createSendHandler();
    render(<ChatComposer disabled={false} labels={testChatLabels} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    fireEvent.change(field, { target: { value: "first line" } });
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("asks for a connection before chatting", function () {
    render(<ChatComposer disabled labels={testChatLabels} onSend={createSendHandler()} />);

    const field = screen.getByRole("textbox", { name: "Message" });
    expect(field).toBeDisabled();
    expect(field).toHaveAttribute("placeholder", "Connect a device to chat");
  });
});
