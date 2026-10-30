import type { ChatMessage, PeerIdentity, VisibleChatMessage } from "./types";

import { normalizePeerAlias } from "./peer-alias";

/**
 * Attributes a decrypted message to the connection it arrived on. A paired device's own
 * messages always show its paired name, whatever author they claim. Forwarded messages keep
 * the author they claim, which cannot be proven, alongside the forwarding device's name.
 */
export function attributeReceivedMessage(
  message: ChatMessage,
  sender: PeerIdentity,
  fallbackAlias: string,
): VisibleChatMessage {
  const visibleMessage = {
    id: message.id,
    isOwn: false,
    sentAt: message.sentAt,
    text: message.text,
  };
  if (!message.relayed) return { ...visibleMessage, author: sender.alias, senderId: sender.id };

  const claimedAuthor = normalizePeerAlias(message.author, fallbackAlias);
  return {
    ...visibleMessage,
    author: claimedAuthor,
    relayedBy: sender.alias,
    senderId: `${sender.id}:${claimedAuthor}`,
  };
}

/** Prepares a received message for forwarding to the other connections. */
export function createRelayedMessage(message: VisibleChatMessage): ChatMessage {
  return {
    author: message.author,
    id: message.id,
    relayed: true,
    sentAt: message.sentAt,
    text: message.text,
  };
}
