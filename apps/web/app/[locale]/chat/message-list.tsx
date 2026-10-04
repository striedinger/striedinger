"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useRef, type ReactNode, type UIEvent } from "react";

import type { ChatLabels, VisibleChatMessage } from "./types";

import { getMessagePlacement } from "./message-grouping";
import { MessageRow } from "./message-row";

interface MessageListProps {
  emptyDescription: string;
  /** The navigation bar, which floats over the conversation as it scrolls underneath. */
  header: ReactNode;
  labels: ChatLabels;
  locale: string;
  messages: VisibleChatMessage[];
}

/**
 * The conversation's scroll view, newest message at the bottom. It follows new messages and
 * the software keyboard while the reader is at the end, and stays put while they read back.
 */
export function MessageList({
  emptyDescription,
  header,
  labels,
  locale,
  messages,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessages = useRef(true);

  useEffect(
    function revealLatestMessage() {
      const scroller = scrollRef.current;
      if (scroller && shouldFollowMessages.current)
        scroller.scrollTo({ top: scroller.scrollHeight });
    },
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Scroll after new message DOM has committed.
    [messages],
  );

  useEffect(function followLatestMessageWhenResized() {
    const scroller = scrollRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;
    // The view shrinks when the keyboard opens; keep the latest message above it.
    const observer = new ResizeObserver(function revealLatestMessageAfterResize() {
      if (shouldFollowMessages.current) scroller.scrollTo({ top: scroller.scrollHeight });
    });
    observer.observe(scroller);
    return function stopFollowingResize() {
      observer.disconnect();
    };
  }, []);

  function updateFollowPreference(event: UIEvent<HTMLDivElement>) {
    const scroller = event.currentTarget;
    shouldFollowMessages.current =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  }

  return (
    <div
      ref={scrollRef}
      data-ios-scroll
      className="absolute inset-x-0 top-0 bottom-(--keyboard-inset,0px) flex flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),10px)+3.75rem)]"
      onScroll={updateFollowPreference}
    >
      {header}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-10 text-center">
          <Text className="text-ios-body font-semibold text-ios-label">{labels.noMessages}</Text>
          <Text className="text-ios-subheadline text-ios-secondary-label">{emptyDescription}</Text>
        </div>
      ) : null}
      <ol
        className="m-0 mx-auto flex w-full max-w-(--ios-content-width) list-none flex-col px-4 py-0"
        aria-label={labels.messages}
        aria-relevant="additions"
        role="log"
      >
        {messages.map(function renderMessage(message, index) {
          return (
            <MessageRow
              key={message.id}
              labels={labels}
              locale={locale}
              message={message}
              placement={getMessagePlacement(messages, index)}
            />
          );
        })}
      </ol>
    </div>
  );
}
