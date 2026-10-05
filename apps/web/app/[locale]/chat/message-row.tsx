import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { MessagePlacement } from "./message-grouping";
import type { ChatLabels, VisibleChatMessage } from "./types";

import { getDateTimeFormat } from "../../../lib/intl-cache";

interface MessageRowProps {
  labels: ChatLabels;
  locale: string;
  message: VisibleChatMessage;
  placement: MessagePlacement;
  /** The message in the reader's language, shown beneath the bubble when it differs. */
  translation?: ReactNode;
}

const timestampFormatOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/**
 * A Messages bubble: sent messages fill with the app tint on the right, received ones sit in
 * gray on the left under the sender's name. Consecutive bubbles from one sender tighten the
 * corners they share, and a centered timestamp opens each group after a pause.
 */
export function MessageRow({ labels, locale, message, placement, translation }: MessageRowProps) {
  const sentAt = new Date(message.sentAt);
  const showsSenderName = !message.isOwn && !placement.continuesGroup;

  return (
    <li
      className={cn(
        "flex flex-col",
        message.isOwn ? "items-end" : "items-start",
        placement.continuesGroup ? "pt-0.5" : "pt-2",
      )}
    >
      {placement.showsTimestamp ? (
        <Text
          as="time"
          dateTime={sentAt.toISOString()}
          className="self-center pt-2 pb-1 text-ios-caption2 font-medium text-ios-secondary-label"
        >
          {getDateTimeFormat(locale, timestampFormatOptions).format(sentAt)}
        </Text>
      ) : null}
      <Text
        as="span"
        className={
          showsSenderName ? "px-3 pb-0.5 text-ios-caption2 text-ios-secondary-label" : "sr-only"
        }
      >
        {message.isOwn ? labels.you : message.author}
      </Text>
      <Text
        className={cn(
          "max-w-[min(75%,30rem)] rounded-ios-lg px-3 py-1.75 text-ios-body break-words whitespace-pre-wrap",
          message.isOwn ? "bg-ios-tint text-white" : "bg-ios-secondary-fill text-ios-label",
          message.isOwn
            ? [
                placement.continuesGroup && "rounded-tr-[6px]",
                placement.continuesIntoNext && "rounded-br-[6px]",
              ]
            : [
                placement.continuesGroup && "rounded-tl-[6px]",
                placement.continuesIntoNext && "rounded-bl-[6px]",
              ],
        )}
      >
        {message.text}
      </Text>
      {translation}
    </li>
  );
}
