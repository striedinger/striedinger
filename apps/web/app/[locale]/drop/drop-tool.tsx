"use client";

import type { DataPayload, MessageAction, Room } from "trystero";

import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { useEffect, useRef, useState } from "react";

import type { DropLabels, SharedFile, TransferItem, TransferMetadata } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { copyText } from "../../../lib/copy-text";
import { DropRadar } from "./drop-radar";
import { FileDropZone } from "./file-drop-zone";
import { LatePeerPrompt } from "./late-peer-prompt";
import { createRoomCode, deriveRoomId, formatRoomCode, parseRoomCode } from "./room-code";
import { RoomPanel } from "./room-panel";
import { sanitizeFileName } from "./sanitize-file-name";
import {
  maximumFileSizeBytes,
  maximumSessionReceiveBytes,
  maximumSessionReceiveFiles,
} from "./transfer-limits";
import { TransferList } from "./transfer-list";

interface DropToolProps {
  labels: DropLabels;
}

const dropAppId = "co.striedinger.drop.v1";
// A peer-claimed type such as text/html would let the blob URL render as a page on this origin.
const receivedFileType = "application/octet-stream";

interface DropSessionState {
  abortController: AbortController | null;
  action: MessageAction | null;
  /** Peers that joined after files were shared and have not been asked about them yet. */
  latePeers: Set<string>;
  objectUrls: Set<string>;
  peers: Set<string>;
  progressFrames: Map<string, ScheduledProgressFrame>;
  queue: Promise<void>;
  /** Bytes and files accepted from every peer, reserved before they arrive. */
  receivedBytes: number;
  receivedFileCount: number;
  /** Peers already told the session is full; sending again disconnects them. */
  sessionLimitedPeers: Set<string>;
  sharedFiles: SharedFile[];
  /** Shared file ids each peer joined too late to receive without the sender confirming. */
  withheldFileIds: Map<string, Set<string>>;
}

interface ScheduledProgressFrame {
  apply: () => void;
  frameId: number;
}

export function DropTool({ labels }: DropToolProps) {
  const [roomCode, setRoomCode] = useState<string>();
  const [peerCount, setPeerCount] = useState(0);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [latePeerFileCount, setLatePeerFileCount] = useState(0);
  const session = useRef<DropSessionState>({
    abortController: null,
    action: null,
    latePeers: new Set(),
    objectUrls: new Set(),
    peers: new Set(),
    progressFrames: new Map(),
    queue: Promise.resolve(),
    receivedBytes: 0,
    receivedFileCount: 0,
    sessionLimitedPeers: new Set(),
    sharedFiles: [],
    withheldFileIds: new Map(),
  });
  const copyResetTimeoutIds = useRef(new Set<number>());
  /** The room this tab is in, so following an invite to the same room keeps the session. */
  const activeRoomCode = useRef<string | null>(null);

  useEffect(function initializeRoomFromFragment() {
    let cancelled = false;

    function syncFragmentRoom() {
      if (cancelled) return;
      const fragmentCode = parseRoomCode(window.location.hash.slice(1));
      // Resetting for the room already open would drop the connection without reconnecting.
      if (fragmentCode !== undefined && fragmentCode === activeRoomCode.current) return;
      const nextRoomCode = fragmentCode ?? createRoomCode();
      activeRoomCode.current = nextRoomCode;
      resetRoomSession(session.current);
      setRoomCode(nextRoomCode);
      setConnectionError(false);
      setCopyFailed(false);
      setTransfers([]);
      setPeerCount(0);
      setLatePeerFileCount(0);

      if (!fragmentCode) updateRoomFragment(nextRoomCode);
    }

    window.queueMicrotask(syncFragmentRoom);
    window.addEventListener("hashchange", syncFragmentRoom);

    return function stopWatchingFragment() {
      cancelled = true;
      window.removeEventListener("hashchange", syncFragmentRoom);
    };
  }, []);

  useEffect(
    function connectToRoom() {
      if (!roomCode) return;
      // A constant keeps the room code narrowed to a string inside the async connect below.
      const roomCodeToJoin = roomCode;

      let cancelled = false;
      let activeRoom: Room | undefined;
      const activeSession = session.current;
      const abortController = new AbortController();
      activeSession.abortController = abortController;

      void connect();

      async function connect() {
        try {
          if (!("RTCPeerConnection" in window) || !("subtle" in globalThis.crypto)) {
            throw new Error("WebRTC is unavailable");
          }

          const [{ joinRoom }, roomId] = await Promise.all([
            import("trystero"),
            deriveRoomId(roomCodeToJoin),
          ]);

          if (cancelled) return;

          const joinedRoom = joinRoom({ appId: dropAppId, password: roomCodeToJoin }, roomId, {
            onJoinError: function handleJoinError() {
              if (!cancelled) setConnectionError(true);
            },
          });
          activeRoom = joinedRoom;
          const action = joinedRoom.makeAction("file");
          activeSession.action = action;

          // Runs before trystero buffers the payload, so oversized transfers never reach memory.
          action.onReceive = function admitIncomingFile({
            byteLength,
            metadata: rawMetadata,
            peerId,
          }) {
            const metadata = readTransferMetadata(rawMetadata);

            if (!metadata) {
              closePeer(activeRoom, peerId);
              return false;
            }
            const rejection = findIncomingRejection(activeSession, byteLength, metadata);

            if (rejection) {
              // Honest senders never exceed the per-file limit or misstate the size, and stop
              // after the first file refused for a full session, so the list stays bounded.
              if (rejection === "session-limit" && !activeSession.sessionLimitedPeers.has(peerId)) {
                activeSession.sessionLimitedPeers.add(peerId);
              } else {
                closePeer(activeRoom, peerId);
                if (rejection === "session-limit") return false;
              }
              upsertIncomingTransfer(
                setTransfers,
                createIncomingTransferKey(peerId, metadata.id),
                metadata,
                0,
                undefined,
                rejection,
              );
              return false;
            }
            activeSession.receivedFileCount += 1;
            activeSession.receivedBytes += byteLength;
            return true;
          };
          action.onReceiveProgress = function updateIncomingProgress(progress, context) {
            const metadata = readTransferMetadata(context.metadata);

            if (!metadata || metadata.size > maximumFileSizeBytes) {
              closePeer(activeRoom, context.peerId);
              return;
            }
            const transferKey = createIncomingTransferKey(context.peerId, metadata.id);
            scheduleProgressUpdate(
              activeSession,
              `incoming-${transferKey}`,
              function applyProgress() {
                upsertIncomingTransfer(setTransfers, transferKey, metadata, progress);
              },
            );
          };
          action.onMessage = function receiveFile(data, context) {
            const metadata = readTransferMetadata(context.metadata);

            if (!metadata) {
              closePeer(activeRoom, context.peerId);
              return;
            }
            const transferKey = createIncomingTransferKey(context.peerId, metadata.id);
            const blob = createFileBlob(data);
            cancelProgressUpdate(activeSession, `incoming-${transferKey}`);

            if (!blob || blob.size !== metadata.size || blob.size > maximumFileSizeBytes) {
              closePeer(activeRoom, context.peerId);
              upsertIncomingTransfer(
                setTransfers,
                transferKey,
                metadata,
                0,
                undefined,
                "invalid-payload",
              );
              return;
            }
            const url = URL.createObjectURL(blob);
            activeSession.objectUrls.add(url);
            upsertIncomingTransfer(setTransfers, transferKey, metadata, 1, url);
          };
          joinedRoom.onPeerJoin = function addPeer(peerId) {
            activeSession.peers.add(peerId);
            setPeerCount(activeSession.peers.size);

            // Anyone holding the link can join, so earlier files wait for the sender to approve.
            if (activeSession.sharedFiles.length === 0) return;
            activeSession.withheldFileIds.set(
              peerId,
              new Set(
                activeSession.sharedFiles.map(function readSharedFileId(sharedFile) {
                  return sharedFile.id;
                }),
              ),
            );
            activeSession.latePeers.add(peerId);
            setLatePeerFileCount(countFilesAwaitingLatePeers(activeSession));
          };
          joinedRoom.onPeerLeave = function removePeer(peerId) {
            activeSession.peers.delete(peerId);
            activeSession.latePeers.delete(peerId);
            activeSession.withheldFileIds.delete(peerId);
            setPeerCount(activeSession.peers.size);
            setLatePeerFileCount(countFilesAwaitingLatePeers(activeSession));
          };
        } catch {
          if (!cancelled) setConnectionError(true);
        }
      }

      return function leaveRoom() {
        cancelled = true;
        abortController.abort();
        if (activeSession.abortController === abortController) {
          activeSession.abortController = null;
          activeSession.action = null;
        }
        activeSession.peers.clear();
        activeSession.latePeers.clear();
        activeSession.withheldFileIds.clear();
        void activeRoom?.leave();
      };
    },
    [roomCode],
  );

  useEffect(function releaseObjectUrlsOnUnmount() {
    const activeSession = session.current;
    const timeoutIds = copyResetTimeoutIds.current;

    return function releaseResources() {
      resetRoomSession(activeSession);
      for (const timeoutId of timeoutIds) window.clearTimeout(timeoutId);
      timeoutIds.clear();
    };
  }, []);

  function handleFiles(files: File[]) {
    const acceptedFiles = files.filter(function acceptFile(file) {
      return file.size <= maximumFileSizeBytes;
    });
    const rejectedFiles = files.filter(function rejectFile(file) {
      return file.size > maximumFileSizeBytes;
    });
    const nextSharedFiles = acceptedFiles.map(function createSharedFile(file) {
      return { file, id: crypto.randomUUID() };
    });
    const activeSession = session.current;
    activeSession.sharedFiles = [...activeSession.sharedFiles, ...nextSharedFiles];

    setTransfers(function addOutgoingTransfers(currentTransfers) {
      return [
        ...rejectedFiles.map<TransferItem>(function createRejectedTransfer(file) {
          return {
            direction: "outgoing",
            id: crypto.randomUUID(),
            name: file.name,
            progress: 0,
            size: file.size,
            status: "error",
            errorReason: "file-too-large",
          };
        }),
        ...nextSharedFiles.map<TransferItem>(function createTransfer(sharedFile) {
          return {
            direction: "outgoing",
            id: sharedFile.id,
            name: sharedFile.file.name,
            progress: 0,
            size: sharedFile.file.size,
            status: "waiting",
          };
        }),
        ...currentTransfers,
      ];
    });

    const action = activeSession.action;
    const peerIds = Array.from(activeSession.peers);
    const signal = activeSession.abortController?.signal;

    if (!action || !signal || peerIds.length === 0) return;
    for (const sharedFile of nextSharedFiles) {
      enqueueSharedFile(activeSession, sharedFile, peerIds, action, signal, setTransfers);
    }
  }

  function handleJoin(rawRoomCode: string) {
    const nextRoomCode = parseRoomCode(rawRoomCode);

    if (!nextRoomCode) return false;
    activeRoomCode.current = nextRoomCode;
    resetRoomSession(session.current);
    setConnectionError(false);
    setCopyFailed(false);
    setTransfers([]);
    setPeerCount(0);
    setLatePeerFileCount(0);
    updateRoomFragment(nextRoomCode);
    setRoomCode(nextRoomCode);
    return true;
  }

  function handleRetry(transferId: string) {
    const activeSession = session.current;
    const sharedFile = activeSession.sharedFiles.find(function findSharedFile(candidate) {
      return candidate.id === transferId;
    });
    const action = activeSession.action;
    const signal = activeSession.abortController?.signal;
    const peerIds = Array.from(activeSession.peers).filter(function isApprovedForFile(peerId) {
      return activeSession.withheldFileIds.get(peerId)?.has(transferId) !== true;
    });

    if (!sharedFile || !action || !signal || peerIds.length === 0) return;
    enqueueSharedFile(activeSession, sharedFile, peerIds, action, signal, setTransfers);
  }

  function handleSendToLatePeers() {
    const activeSession = session.current;
    const action = activeSession.action;
    const signal = activeSession.abortController?.signal;

    if (!action || !signal) return;
    const latePeerIds = Array.from(activeSession.latePeers);

    for (const sharedFile of activeSession.sharedFiles) {
      const peerIds = latePeerIds.filter(function isWithheldFromPeer(peerId) {
        return activeSession.withheldFileIds.get(peerId)?.has(sharedFile.id) === true;
      });

      if (peerIds.length > 0) {
        enqueueSharedFile(activeSession, sharedFile, peerIds, action, signal, setTransfers);
      }
    }
    for (const peerId of latePeerIds) activeSession.withheldFileIds.delete(peerId);
    activeSession.latePeers.clear();
    setLatePeerFileCount(0);
  }

  function handleDismissLatePeers() {
    // The files stay withheld from these peers; only the prompt goes away.
    session.current.latePeers.clear();
    setLatePeerFileCount(0);
  }

  async function copyInviteLink() {
    if (!roomCode) return;
    const shareUrl = createInviteUrl(roomCode);
    const didCopy = await copyText(shareUrl);
    setCopied(didCopy);
    setCopyFailed(!didCopy);

    if (!didCopy) return;
    const timeoutId = window.setTimeout(function resetCopiedState() {
      copyResetTimeoutIds.current.delete(timeoutId);
      setCopied(false);
    }, 2_000);
    copyResetTimeoutIds.current.add(timeoutId);
  }

  async function shareInviteLink() {
    if (!roomCode) return;
    const shareUrl = createInviteUrl(roomCode);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: labels.title,
          text: labels.description,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await copyInviteLink();
  }

  // Copying and sharing settle their own failures, so these promises never reject.
  function handleCopy() {
    void copyInviteLink();
  }

  function handleShare() {
    void shareInviteLink();
  }

  return (
    <FileDropZone labels={labels} onFiles={handleFiles}>
      <div
        data-ios-scroll
        className="flex h-full flex-col overflow-y-auto overscroll-contain pb-safe-plus-28 [--ios-bar-edge:var(--ios-grouped-background)] [--ios-content-width:42rem]"
      >
        <IosNavigationBar
          title={labels.title}
          leading={<IosAppSwitcherButton />}
          trailing={
            <IosBarButton aria-label={labels.share} disabled={!roomCode} onClick={handleShare}>
              <ShareUpIcon />
            </IosBarButton>
          }
        />
        <div className="mx-auto flex w-full max-w-(--ios-content-width) flex-col gap-2 pb-4">
          <DropRadar connectionError={connectionError} labels={labels} peerCount={peerCount} />
          {latePeerFileCount > 0 ? (
            <LatePeerPrompt
              fileCount={latePeerFileCount}
              labels={labels}
              onDismiss={handleDismissLatePeers}
              onSend={handleSendToLatePeers}
            />
          ) : null}
          <RoomPanel
            key={roomCode}
            copied={copied}
            copyFailed={copyFailed}
            labels={labels}
            onCopy={handleCopy}
            onJoin={handleJoin}
            roomCode={roomCode}
          />
          <TransferList
            canRetry={peerCount > 0}
            items={transfers}
            labels={labels}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </FileDropZone>
  );
}

function createInviteUrl(roomCode: string) {
  return `${window.location.origin}${window.location.pathname}#${formatRoomCode(roomCode)}`;
}

function updateRoomFragment(roomCode: string) {
  const nextUrl = `${window.location.pathname}${window.location.search}#${formatRoomCode(roomCode)}`;
  window.history.replaceState(null, "", nextUrl);
}

function readTransferMetadata(metadata: unknown): TransferMetadata | undefined {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return;
  const candidate = metadata as Record<string, unknown>;

  if (
    typeof candidate["id"] !== "string" ||
    candidate["id"].length === 0 ||
    candidate["id"].length > 100 ||
    typeof candidate["name"] !== "string" ||
    candidate["name"].length === 0 ||
    candidate["name"].length > 1_024 ||
    typeof candidate["size"] !== "number" ||
    !Number.isSafeInteger(candidate["size"]) ||
    candidate["size"] < 0 ||
    typeof candidate["lastModified"] !== "number" ||
    !Number.isFinite(candidate["lastModified"])
  ) {
    return;
  }

  return {
    id: candidate["id"],
    lastModified: candidate["lastModified"],
    name: sanitizeFileName(candidate["name"]),
    size: candidate["size"],
  };
}

function findIncomingRejection(
  session: DropSessionState,
  byteLength: number,
  metadata: TransferMetadata,
): TransferItem["errorReason"] {
  if (byteLength > maximumFileSizeBytes || metadata.size > maximumFileSizeBytes) {
    return "file-too-large";
  }
  if (byteLength !== metadata.size) return "invalid-payload";
  if (
    session.receivedFileCount >= maximumSessionReceiveFiles ||
    session.receivedBytes + byteLength > maximumSessionReceiveBytes
  ) {
    return "session-limit";
  }
  return undefined;
}

function createIncomingTransferKey(peerId: string, transferId: string) {
  // Peers choose their own transfer ids, so scoping by sender keeps one from replacing another's.
  return JSON.stringify([peerId, transferId]);
}

function countFilesAwaitingLatePeers(session: DropSessionState) {
  const fileIds = new Set<string>();

  for (const peerId of session.latePeers) {
    for (const fileId of session.withheldFileIds.get(peerId) ?? []) fileIds.add(fileId);
  }
  return fileIds.size;
}

function closePeer(room: Room | undefined, peerId: string) {
  room?.getPeers()[peerId]?.close();
}

function createFileBlob(data: DataPayload) {
  if (data instanceof Blob || data instanceof ArrayBuffer) {
    return new Blob([data], { type: receivedFileType });
  }
  if (ArrayBuffer.isView(data)) {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
    return new Blob([bytes], { type: receivedFileType });
  }
  return undefined;
}

function resetRoomSession(session: DropSessionState) {
  session.abortController?.abort();
  session.abortController = null;
  session.action = null;
  session.peers.clear();
  session.latePeers.clear();
  session.withheldFileIds.clear();
  session.sharedFiles = [];
  session.queue = Promise.resolve();
  session.receivedBytes = 0;
  session.receivedFileCount = 0;
  session.sessionLimitedPeers.clear();

  for (const progressFrame of session.progressFrames.values()) {
    window.cancelAnimationFrame(progressFrame.frameId);
  }
  session.progressFrames.clear();

  for (const objectUrl of session.objectUrls) URL.revokeObjectURL(objectUrl);
  session.objectUrls.clear();
}

function upsertIncomingTransfer(
  setTransfers: React.Dispatch<React.SetStateAction<TransferItem[]>>,
  transferKey: string,
  metadata: TransferMetadata,
  progress: number,
  url?: string,
  errorReason?: TransferItem["errorReason"],
) {
  setTransfers(function updateIncomingTransfers(currentTransfers) {
    const existingIndex = currentTransfers.findIndex(function findTransfer(transfer) {
      return transfer.direction === "incoming" && transfer.id === transferKey;
    });
    const nextTransfer: TransferItem = {
      direction: "incoming",
      errorReason,
      id: transferKey,
      name: metadata.name,
      progress,
      size: metadata.size,
      status: errorReason ? "error" : progress >= 1 ? "complete" : "sending",
      url,
    };

    if (existingIndex === -1) return [nextTransfer, ...currentTransfers];
    const nextTransfers = [...currentTransfers];
    nextTransfers[existingIndex] = { ...nextTransfers[existingIndex], ...nextTransfer };
    return nextTransfers;
  });
}

async function sendSharedFile(
  session: DropSessionState,
  sharedFile: SharedFile,
  peerIds: string[],
  action: MessageAction,
  signal: AbortSignal,
  setTransfers: React.Dispatch<React.SetStateAction<TransferItem[]>>,
) {
  if (signal.aborted) return;
  const progressKey = `outgoing-${sharedFile.id}`;
  updateOutgoingTransfer(setTransfers, sharedFile.id, {
    errorReason: undefined,
    progress: 0,
    status: "sending",
  });

  try {
    await action.send(sharedFile.file, {
      target: peerIds,
      metadata: {
        id: sharedFile.id,
        lastModified: sharedFile.file.lastModified,
        name: sharedFile.file.name,
        size: sharedFile.file.size,
        type: sharedFile.file.type,
      },
      onProgress: function updateProgress(progress) {
        if (signal.aborted) return;
        scheduleProgressUpdate(session, progressKey, function applyProgress() {
          updateOutgoingTransfer(setTransfers, sharedFile.id, { progress, status: "sending" });
        });
      },
      signal,
    });
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- The signal can abort while the send is awaited.
    if (signal.aborted) return;
    cancelProgressUpdate(session, progressKey);
    updateOutgoingTransfer(setTransfers, sharedFile.id, { progress: 1, status: "complete" });
  } catch {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- The signal can abort while the send is awaited.
    if (signal.aborted) return;
    cancelProgressUpdate(session, progressKey);
    updateOutgoingTransfer(setTransfers, sharedFile.id, {
      errorReason: "send-failed",
      progress: 0,
      status: "error",
    });
  }
}

function enqueueSharedFile(
  session: DropSessionState,
  sharedFile: SharedFile,
  peerIds: string[],
  action: MessageAction,
  signal: AbortSignal,
  setTransfers: React.Dispatch<React.SetStateAction<TransferItem[]>>,
) {
  session.queue = session.queue
    .catch(function continueAfterFailedTransfer() {
      return undefined;
    })
    .then(function sendNextFile() {
      return sendSharedFile(session, sharedFile, peerIds, action, signal, setTransfers);
    });
}

function scheduleProgressUpdate(session: DropSessionState, progressKey: string, apply: () => void) {
  const scheduledFrame = session.progressFrames.get(progressKey);

  if (scheduledFrame) {
    scheduledFrame.apply = apply;
    return;
  }

  const nextFrame: ScheduledProgressFrame = {
    apply,
    frameId: window.requestAnimationFrame(function applyLatestProgress() {
      session.progressFrames.delete(progressKey);
      nextFrame.apply();
    }),
  };
  session.progressFrames.set(progressKey, nextFrame);
}

function cancelProgressUpdate(session: DropSessionState, progressKey: string) {
  const scheduledFrame = session.progressFrames.get(progressKey);

  if (!scheduledFrame) return;
  window.cancelAnimationFrame(scheduledFrame.frameId);
  session.progressFrames.delete(progressKey);
}

function updateOutgoingTransfer(
  setTransfers: React.Dispatch<React.SetStateAction<TransferItem[]>>,
  transferId: string,
  update: Pick<TransferItem, "progress" | "status"> & Partial<Pick<TransferItem, "errorReason">>,
) {
  setTransfers(function updateTransfers(currentTransfers) {
    return currentTransfers.map(function updateTransfer(transfer) {
      return transfer.direction === "outgoing" && transfer.id === transferId
        ? { ...transfer, ...update }
        : transfer;
    });
  });
}
