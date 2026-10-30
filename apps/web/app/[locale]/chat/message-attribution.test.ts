import { describe, expect, it } from "vitest";

import { attributeReceivedMessage, createRelayedMessage } from "./message-attribution";

const sender = { alias: "Quiet Otter", id: "connection-1" };

describe("received message attribution", function () {
  it("shows a paired device's messages under its paired name, whatever author they claim", function () {
    const message = attributeReceivedMessage(
      { author: "Silver Finch", id: "direct", sentAt: 0, text: "I am Silver Finch" },
      sender,
      "Anonymous neighbor",
    );

    expect(message).toEqual({
      author: "Quiet Otter",
      id: "direct",
      isOwn: false,
      senderId: "connection-1",
      sentAt: 0,
      text: "I am Silver Finch",
    });
  });

  it("names the forwarding device on relayed messages and groups them apart from its own", function () {
    const message = attributeReceivedMessage(
      { author: "Silver Finch", id: "relayed", relayed: true, sentAt: 0, text: "hello" },
      sender,
      "Anonymous neighbor",
    );

    expect(message).toMatchObject({
      author: "Silver Finch",
      isOwn: false,
      relayedBy: "Quiet Otter",
    });
    expect(message.senderId).not.toBe(sender.id);
  });

  it("replaces relayed author names the app could not have generated", function () {
    const message = attributeReceivedMessage(
      { author: "Amber Fox via Calm Owl", id: "spoof", relayed: true, sentAt: 0, text: "hi" },
      sender,
      "Anonymous neighbor",
    );

    expect(message.author).toBe("Anonymous neighbor");
  });

  it("forwards messages marked as relayed under the name they were shown with", function () {
    const received = attributeReceivedMessage(
      { author: "Silver Finch", id: "direct", sentAt: 0, text: "hello" },
      sender,
      "Anonymous neighbor",
    );

    expect(createRelayedMessage(received)).toEqual({
      author: "Quiet Otter",
      id: "direct",
      relayed: true,
      sentAt: 0,
      text: "hello",
    });
  });
});
