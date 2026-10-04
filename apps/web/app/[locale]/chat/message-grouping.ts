import type { VisibleChatMessage } from "./types";

// Like Messages, a centered timestamp separates messages sent after a pause.
const timestampGapMilliseconds = 15 * 60 * 1_000;

export interface MessagePlacement {
  /** The previous bubble is from the same sender with no timestamp in between. */
  continuesGroup: boolean;
  /** The next bubble is from the same sender with no timestamp in between. */
  continuesIntoNext: boolean;
  showsTimestamp: boolean;
}

/** Places a message within runs of consecutive bubbles from the same sender. */
export function getMessagePlacement(
  messages: readonly VisibleChatMessage[],
  index: number,
): MessagePlacement {
  const message = messages[index]!;
  const previous = messages[index - 1];
  const next = messages[index + 1];
  const showsTimestamp = !previous || isAfterPause(previous, message);

  return {
    continuesGroup: !!previous && !showsTimestamp && isSameSender(previous, message),
    continuesIntoNext: !!next && !isAfterPause(message, next) && isSameSender(message, next),
    showsTimestamp,
  };
}

function isAfterPause(earlier: VisibleChatMessage, later: VisibleChatMessage) {
  return later.sentAt - earlier.sentAt > timestampGapMilliseconds;
}

function isSameSender(first: VisibleChatMessage, second: VisibleChatMessage) {
  return first.isOwn === second.isOwn && first.author === second.author;
}
