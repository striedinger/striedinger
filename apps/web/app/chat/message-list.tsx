"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useRef, type UIEvent } from "react";

import type { VisibleChatMessage } from "./types";

interface MessageListProps {
  messages: VisibleChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const shouldFollowMessages = useRef(true);

  useEffect(
    function revealLatestMessage() {
      const list = listRef.current;
      if (list && shouldFollowMessages.current) list.scrollTo({ top: list.scrollHeight });
    },
    [messages],
  );

  function updateFollowPreference(event: UIEvent<HTMLOListElement>) {
    const list = event.currentTarget;
    shouldFollowMessages.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center">
        <div className="flex max-w-sm flex-col gap-2">
          <Text weight="medium">No messages yet</Text>
          <Text size="sm" tone="muted">
            Connect a device to start chatting.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <ol
      ref={listRef}
      className="flex min-h-0 flex-1 list-none flex-col gap-4 overflow-y-auto p-4 sm:p-6"
      aria-label="Messages"
      aria-relevant="additions"
      role="log"
      onScroll={updateFollowPreference}
    >
      {messages.map(function renderMessage(message) {
        return (
          <li
            key={message.id}
            className={`flex flex-col gap-1 ${message.isOwn ? "items-end" : "items-start"}`}
          >
            <div className="flex items-baseline gap-2 px-1">
              <Text as="span" size="xs" weight="semibold">
                {message.isOwn ? "You" : message.author}
              </Text>
              <Text
                as="time"
                size="xs"
                tone="muted"
                dateTime={new Date(message.sentAt).toISOString()}
              >
                {new Date(message.sentAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </div>
            <Text
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap ${
                message.isOwn
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-secondary text-secondary-foreground"
              }`}
            >
              {message.text}
            </Text>
          </li>
        );
      })}
    </ol>
  );
}
