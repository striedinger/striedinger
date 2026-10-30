"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ChatLabels,
  ChatMessage,
  PairingState,
  PeerSession,
  VisibleChatMessage,
} from "./types";

import { attributeReceivedMessage, createRelayedMessage } from "./message-attribution";
import {
  createMessageKey,
  decryptMessage,
  encryptMessage,
  importMessageKey,
} from "./message-crypto";
import { MessageRateLimiter } from "./message-rate-limiter";
import { choosePeerAlias, createAnonymousAlias } from "./peer-alias";
import { RecentMessageIds } from "./recent-message-ids";
import { decodePairingBundle, encodePairingBundle, waitForIceGathering } from "./signaling";

const maximumMessagesPerPeerPerSecond = 30;
// Peer ids are UUIDs, so this can never match a connection's sender id.
const ownSenderId = "own";

const maximumRememberedMessageIds = 1_000;
const maximumVisibleMessages = 500;
const peerConnectionConfiguration: RTCConfiguration = {
  bundlePolicy: "max-bundle",
  iceCandidatePoolSize: 0,
  iceServers: [],
};

interface PendingPairing {
  connection: RTCPeerConnection;
  key: CryptoKey;
  /** The name the other device sent while pairing; the inviter learns it from the reply. */
  remoteAlias: string | undefined;
}

export function useNearbyChat(labels: ChatLabels) {
  const [alias, setAlias] = useState(labels.anonymousAlias);
  const [connectionError, setConnectionError] = useState("");
  const [messages, setMessages] = useState<VisibleChatMessage[]>([]);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingState, setPairingState] = useState<PairingState>("idle");
  const [peerCount, setPeerCount] = useState(0);
  const pendingPairing = useRef<PendingPairing | null>(null);
  const peers = useRef(new Map<string, PeerSession>());
  const seenMessageIds = useRef(new RecentMessageIds(maximumRememberedMessageIds));

  useEffect(function assignEphemeralAlias() {
    let cancelled = false;
    window.queueMicrotask(function updateAlias() {
      if (!cancelled) setAlias(createAnonymousAlias());
    });
    return function cancelAliasUpdate() {
      cancelled = true;
    };
  }, []);

  useEffect(function releaseConnectionsOnUnmount() {
    const activePeers = peers.current;

    return function releaseConnections() {
      pendingPairing.current?.connection.close();
      pendingPairing.current = null;
      for (const peer of activePeers.values()) peer.connection.close();
      activePeers.clear();
    };
  }, []);

  async function createInvite() {
    resetPendingPairing();
    setConnectionError("");
    setPairingCode("");
    setPairingState("creating");

    try {
      assertSupported();
      const connection = createPeerConnection();
      const { exported, key } = await createMessageKey();
      const pairing: PendingPairing = { connection, key, remoteAlias: undefined };
      pendingPairing.current = pairing;
      registerChannel(pairing, connection.createDataChannel("nearby-chat", { ordered: true }));
      await connection.setLocalDescription(await connection.createOffer());
      await waitForIceGathering(connection);
      if (!connection.localDescription) throw new Error("No local connection description");
      setPairingCode(
        await encodePairingBundle({
          alias,
          description: connection.localDescription.toJSON(),
          key: exported,
          version: 1,
        }),
      );
      setPairingState("answer");
    } catch {
      failPairing(labels.inviteFailed);
    }
  }

  async function acceptInvite(inviteCode: string) {
    resetPendingPairing();
    setConnectionError("");
    setPairingCode("");
    setPairingState("creating");

    try {
      assertSupported();
      const invite = await decodePairingBundle(inviteCode);
      if (invite.description.type !== "offer" || invite.key === undefined) {
        throw new Error("Expected an offer");
      }
      const connection = createPeerConnection();
      const key = await importMessageKey(invite.key);
      const pairing: PendingPairing = { connection, key, remoteAlias: invite.alias };
      pendingPairing.current = pairing;
      connection.addEventListener("datachannel", function receiveDataChannel(event) {
        registerChannel(pairing, event.channel);
      });
      await connection.setRemoteDescription(invite.description);
      await connection.setLocalDescription(await connection.createAnswer());
      await waitForIceGathering(connection);
      if (!connection.localDescription) throw new Error("No local connection description");
      setPairingCode(
        await encodePairingBundle({
          alias,
          description: connection.localDescription.toJSON(),
          version: 1,
        }),
      );
      setPairingState("share");
    } catch {
      failPairing(labels.invalidInvite);
    }
  }

  async function acceptAnswer(answerCode: string) {
    const pending = pendingPairing.current;
    if (!pending) return;
    setConnectionError("");
    setPairingState("connecting");

    try {
      const answer = await decodePairingBundle(answerCode);
      if (answer.description.type !== "answer") throw new Error("Expected an answer");
      pending.remoteAlias = answer.alias;
      await pending.connection.setRemoteDescription(answer.description);
    } catch {
      setConnectionError(labels.invalidAnswer);
      setPairingState("answer");
    }
  }

  function cancelPairing() {
    resetPendingPairing();
    setConnectionError("");
    setPairingCode("");
    setPairingState("idle");
  }

  async function sendMessage(text: string, sentAt: number) {
    const normalizedText = text.trim().slice(0, 2_000);
    if (!normalizedText || peers.current.size === 0) return false;
    const message: ChatMessage = {
      author: alias,
      id: crypto.randomUUID(),
      sentAt,
      text: normalizedText,
    };
    seenMessageIds.current.add(message.id);
    appendMessage({ ...message, isOwn: true, senderId: ownSenderId });
    await broadcastMessage(message);
    return true;
  }

  function createPeerConnection() {
    const connection = new RTCPeerConnection(peerConnectionConfiguration);
    connection.addEventListener("connectionstatechange", function handleConnectionState() {
      if (connection.connectionState === "failed") {
        setConnectionError(labels.connectionFailed);
      }
    });
    return connection;
  }

  function registerChannel(pairing: PendingPairing, channel: RTCDataChannel) {
    const { connection, key } = pairing;
    const peerId = crypto.randomUUID();
    const messageRateLimiter = new MessageRateLimiter(maximumMessagesPerPeerPerSecond, 1_000);
    channel.binaryType = "arraybuffer";

    channel.addEventListener("open", function addPeer() {
      const takenAliases = [alias, ...Array.from(peers.current.values(), getPeerAlias)];
      const peerAlias = choosePeerAlias(pairing.remoteAlias, takenAliases, labels.anonymousAlias);
      peers.current.set(peerId, { alias: peerAlias, channel, connection, id: peerId, key });
      setPeerCount(peers.current.size);
      setPairingCode("");
      setPairingState("idle");
      setConnectionError("");
      if (pendingPairing.current?.connection === connection) pendingPairing.current = null;
    });
    channel.addEventListener("close", function removePeer() {
      peers.current.delete(peerId);
      setPeerCount(peers.current.size);
      // A dropped peer's connection would otherwise hold its network resources until the page
      // closes, and browsers limit how many can be open.
      connection.close();
    });
    channel.addEventListener("message", function receiveMessage(event) {
      if (
        typeof event.data !== "string" ||
        event.data.length > 12_000 ||
        !messageRateLimiter.allows(performance.now())
      )
        return;
      void receiveEncryptedMessage(peerId, key, event.data);
    });
  }

  async function receiveEncryptedMessage(sourcePeerId: string, key: CryptoKey, payload: string) {
    try {
      const message = await decryptMessage(key, payload);
      const sender = peers.current.get(sourcePeerId);
      if (!sender || seenMessageIds.current.has(message.id)) return;
      seenMessageIds.current.add(message.id);
      const visibleMessage = attributeReceivedMessage(message, sender, labels.anonymousAlias);
      appendMessage(visibleMessage);
      await broadcastMessage(createRelayedMessage(visibleMessage), sourcePeerId);
    } catch {
      // Ignore malformed or unauthenticated packets without disrupting the room.
    }
  }

  async function broadcastMessage(message: ChatMessage, excludedPeerId?: string) {
    const sends: Promise<void>[] = [];
    for (const peer of peers.current.values()) {
      if (peer.id === excludedPeerId || peer.channel.readyState !== "open") continue;
      sends.push(
        encryptMessage(peer.key, message).then(function sendEncryptedMessage(payload) {
          if (peer.channel.readyState === "open") peer.channel.send(payload);
          return undefined;
        }),
      );
    }
    await Promise.all(sends);
  }

  function appendMessage(message: VisibleChatMessage) {
    setMessages(function addMessage(currentMessages) {
      return [...currentMessages.slice(-(maximumVisibleMessages - 1)), message];
    });
  }

  function failPairing(message: string) {
    resetPendingPairing();
    setPairingCode("");
    setPairingState("idle");
    setConnectionError(message);
  }

  function resetPendingPairing() {
    pendingPairing.current?.connection.close();
    pendingPairing.current = null;
  }

  return {
    acceptAnswer,
    acceptInvite,
    alias,
    cancelPairing,
    connectionError,
    createInvite,
    messages,
    pairingCode,
    pairingState,
    peerCount,
    sendMessage,
  };
}

function getPeerAlias(peer: PeerSession) {
  return peer.alias;
}

function assertSupported() {
  if (!("RTCPeerConnection" in window) || !("subtle" in globalThis.crypto)) {
    throw new Error("Nearby chat is unsupported");
  }
}
