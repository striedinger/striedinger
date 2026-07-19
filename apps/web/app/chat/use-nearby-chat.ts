"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatMessage, PairingState, PeerSession, VisibleChatMessage } from "./types";

import {
  createMessageKey,
  decryptMessage,
  encryptMessage,
  importMessageKey,
} from "./message-crypto";
import { MessageRateLimiter } from "./message-rate-limiter";
import { RecentMessageIds } from "./recent-message-ids";

const maximumMessagesPerPeerPerSecond = 30;
import { decodePairingBundle, encodePairingBundle, waitForIceGathering } from "./signaling";

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
}

export function useNearbyChat() {
  const [alias, setAlias] = useState("Anonymous neighbor");
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
      pendingPairing.current = { connection, key };
      registerChannel(
        connection,
        connection.createDataChannel("nearby-chat", { ordered: true }),
        key,
      );
      await connection.setLocalDescription(await connection.createOffer());
      await waitForIceGathering(connection);
      if (!connection.localDescription) throw new Error("No local connection description");
      setPairingCode(
        await encodePairingBundle({
          description: connection.localDescription.toJSON(),
          key: exported,
          version: 1,
        }),
      );
      setPairingState("answer");
    } catch {
      failPairing("Could not create an invite. Check browser support and try again.");
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
      if (invite.description.type !== "offer") throw new Error("Expected an offer");
      const connection = createPeerConnection();
      const key = await importMessageKey(invite.key);
      pendingPairing.current = { connection, key };
      connection.addEventListener("datachannel", function receiveDataChannel(event) {
        registerChannel(connection, event.channel, key);
      });
      await connection.setRemoteDescription(invite.description);
      await connection.setLocalDescription(await connection.createAnswer());
      await waitForIceGathering(connection);
      if (!connection.localDescription) throw new Error("No local connection description");
      setPairingCode(
        await encodePairingBundle({
          description: connection.localDescription.toJSON(),
          key: invite.key,
          version: 1,
        }),
      );
      setPairingState("share");
    } catch {
      failPairing("That invite is invalid or could not be opened.");
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
      await pending.connection.setRemoteDescription(answer.description);
    } catch {
      setConnectionError("That answer is invalid. Ask the other device to create it again.");
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
    appendMessage(message, true);
    await broadcastMessage(message);
    return true;
  }

  function createPeerConnection() {
    const connection = new RTCPeerConnection(peerConnectionConfiguration);
    connection.addEventListener("connectionstatechange", function handleConnectionState() {
      if (connection.connectionState === "failed") {
        setConnectionError(
          "A local connection could not be established. Keep both devices on the same Wi-Fi network and try again.",
        );
      }
    });
    return connection;
  }

  function registerChannel(connection: RTCPeerConnection, channel: RTCDataChannel, key: CryptoKey) {
    const peerId = crypto.randomUUID();
    const messageRateLimiter = new MessageRateLimiter(maximumMessagesPerPeerPerSecond, 1_000);
    channel.binaryType = "arraybuffer";

    channel.addEventListener("open", function addPeer() {
      peers.current.set(peerId, { channel, connection, id: peerId, key });
      setPeerCount(peers.current.size);
      setPairingCode("");
      setPairingState("idle");
      setConnectionError("");
      if (pendingPairing.current?.connection === connection) pendingPairing.current = null;
    });
    channel.addEventListener("close", function removePeer() {
      peers.current.delete(peerId);
      setPeerCount(peers.current.size);
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
      if (seenMessageIds.current.has(message.id)) return;
      seenMessageIds.current.add(message.id);
      appendMessage(message, false);
      await broadcastMessage(message, sourcePeerId);
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

  function appendMessage(message: ChatMessage, isOwn: boolean) {
    setMessages(function addMessage(currentMessages) {
      return [...currentMessages.slice(-(maximumVisibleMessages - 1)), { ...message, isOwn }];
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

function assertSupported() {
  if (!("RTCPeerConnection" in window) || !globalThis.crypto?.subtle) {
    throw new Error("Nearby chat is unsupported");
  }
}

function createAnonymousAlias(): string {
  const adjectives = ["Amber", "Blue", "Bright", "Calm", "Copper", "Quiet", "Silver", "Swift"];
  const animals = ["Badger", "Finch", "Fox", "Heron", "Moth", "Otter", "Owl", "Wren"];
  const randomValues = crypto.getRandomValues(new Uint16Array(2));
  return `${adjectives[randomValues[0]! % adjectives.length]} ${animals[randomValues[1]! % animals.length]}`;
}
