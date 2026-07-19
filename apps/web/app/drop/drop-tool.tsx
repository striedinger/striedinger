"use client";

import type { DataPayload, MessageAction, Room } from "trystero";

import { useEffect, useRef, useState } from "react";

import type { DropLabels, SharedFile, TransferItem, TransferMetadata } from "./types";

import { copyText } from "../../lib/copy-text";
import { FileDropZone } from "./file-drop-zone";
import { createRoomCode, deriveRoomId, formatRoomCode, parseRoomCode } from "./room-code";
import { RoomPanel } from "./room-panel";
import { maximumFileSizeBytes } from "./transfer-limits";
import { TransferList } from "./transfer-list";

interface DropToolProps {
  labels: DropLabels;
}

const dropAppId = "co.striedinger.drop.v1";

interface DropSessionState {
  abortController: AbortController | null;
  action: MessageAction | null;
  objectUrls: Set<string>;
  peers: Set<string>;
  progressFrames: Map<string, ScheduledProgressFrame>;
  queue: Promise<void>;
  sharedFiles: SharedFile[];
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
  const session = useRef<DropSessionState>({
    abortController: null,
    action: null,
    objectUrls: new Set(),
    peers: new Set(),
    progressFrames: new Map(),
    queue: Promise.resolve(),
    sharedFiles: [],
  });
  const copyResetTimeoutIds = useRef(new Set<number>());

  useEffect(function initializeRoomFromFragment() {
    let cancelled = false;

    function syncFragmentRoom() {
      if (cancelled) return;
      const fragmentCode = parseRoomCode(window.location.hash.slice(1));
      const nextRoomCode = fragmentCode ?? createRoomCode();
      resetRoomSession(session.current);
      setRoomCode(nextRoomCode);
      setConnectionError(false);
      setCopyFailed(false);
      setTransfers([]);
      setPeerCount(0);

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

      let cancelled = false;
      let activeRoom: Room | undefined;
      const activeSession = session.current;
      const abortController = new AbortController();
      activeSession.abortController = abortController;

      void connect();

      async function connect() {
        try {
          if (!("RTCPeerConnection" in window) || !globalThis.crypto?.subtle) {
            throw new Error("WebRTC is unavailable");
          }

          const [{ joinRoom }, roomId] = await Promise.all([
            import("trystero"),
            deriveRoomId(roomCode as string),
          ]);

          if (cancelled) return;

          const joinedRoom = joinRoom({ appId: dropAppId, password: roomCode }, roomId, {
            onJoinError: function handleJoinError() {
              if (!cancelled) setConnectionError(true);
            },
          });
          activeRoom = joinedRoom;
          const action = joinedRoom.makeAction("file");
          activeSession.action = action;

          action.onReceiveProgress = function updateIncomingProgress(progress, context) {
            const metadata = readTransferMetadata(context.metadata);

            if (!metadata) {
              closePeer(activeRoom, context.peerId);
              return;
            }
            scheduleProgressUpdate(
              activeSession,
              `incoming-${metadata.id}`,
              function applyProgress() {
                upsertIncomingTransfer(setTransfers, metadata, progress);
              },
            );
          };
          action.onMessage = function receiveFile(data, context) {
            const metadata = readTransferMetadata(context.metadata);

            if (!metadata) {
              closePeer(activeRoom, context.peerId);
              return;
            }
            const blob = createFileBlob(data, metadata.type);

            if (!blob || blob.size !== metadata.size || blob.size > maximumFileSizeBytes) {
              closePeer(activeRoom, context.peerId);
              upsertIncomingTransfer(setTransfers, metadata, 0, undefined, "invalid-payload");
              return;
            }
            cancelProgressUpdate(activeSession, `incoming-${metadata.id}`);
            const url = URL.createObjectURL(blob);
            activeSession.objectUrls.add(url);
            upsertIncomingTransfer(setTransfers, metadata, 1, url);
          };
          joinedRoom.onPeerJoin = function addPeer(peerId) {
            activeSession.peers.add(peerId);
            setPeerCount(activeSession.peers.size);

            for (const sharedFile of activeSession.sharedFiles) {
              enqueueSharedFile(
                activeSession,
                sharedFile,
                [peerId],
                action,
                abortController.signal,
                setTransfers,
              );
            }
          };
          joinedRoom.onPeerLeave = function removePeer(peerId) {
            activeSession.peers.delete(peerId);
            setPeerCount(activeSession.peers.size);
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
    resetRoomSession(session.current);
    setConnectionError(false);
    setCopyFailed(false);
    setTransfers([]);
    setPeerCount(0);
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
    const peerIds = Array.from(activeSession.peers);

    if (!sharedFile || !action || !signal || peerIds.length === 0) return;
    enqueueSharedFile(activeSession, sharedFile, peerIds, action, signal, setTransfers);
  }

  async function handleCopy() {
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

  async function handleShare() {
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

    await handleCopy();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <FileDropZone labels={labels} onFiles={handleFiles} />
        <TransferList
          canRetry={peerCount > 0}
          items={transfers}
          labels={labels}
          onRetry={handleRetry}
        />
      </div>
      <aside className="min-w-0 lg:sticky lg:top-20">
        <RoomPanel
          key={roomCode}
          connectionError={connectionError}
          copied={copied}
          copyFailed={copyFailed}
          labels={labels}
          onCopy={handleCopy}
          onJoin={handleJoin}
          onShare={handleShare}
          peerCount={peerCount}
          roomCode={roomCode}
        />
      </aside>
    </div>
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
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return;
  const candidate = metadata as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    candidate.id.length > 100 ||
    typeof candidate.name !== "string" ||
    candidate.name.length === 0 ||
    candidate.name.length > 1_024 ||
    typeof candidate.size !== "number" ||
    !Number.isFinite(candidate.size) ||
    candidate.size < 0 ||
    candidate.size > maximumFileSizeBytes ||
    typeof candidate.type !== "string" ||
    candidate.type.length > 255 ||
    typeof candidate.lastModified !== "number" ||
    !Number.isFinite(candidate.lastModified)
  ) {
    return;
  }

  return {
    id: candidate.id,
    lastModified: candidate.lastModified,
    name: candidate.name,
    size: candidate.size,
    type: candidate.type,
  };
}

function closePeer(room: Room | undefined, peerId: string) {
  room?.getPeers()[peerId]?.close();
}

function createFileBlob(data: DataPayload, type?: string) {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data], { type });
  if (ArrayBuffer.isView(data)) {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
    return new Blob([bytes], { type });
  }
}

function resetRoomSession(session: DropSessionState) {
  session.abortController?.abort();
  session.abortController = null;
  session.action = null;
  session.peers.clear();
  session.sharedFiles = [];
  session.queue = Promise.resolve();

  for (const progressFrame of session.progressFrames.values()) {
    window.cancelAnimationFrame(progressFrame.frameId);
  }
  session.progressFrames.clear();

  for (const objectUrl of session.objectUrls) URL.revokeObjectURL(objectUrl);
  session.objectUrls.clear();
}

function upsertIncomingTransfer(
  setTransfers: React.Dispatch<React.SetStateAction<TransferItem[]>>,
  metadata: TransferMetadata,
  progress: number,
  url?: string,
  errorReason?: TransferItem["errorReason"],
) {
  setTransfers(function updateIncomingTransfers(currentTransfers) {
    const existingIndex = currentTransfers.findIndex(function findTransfer(transfer) {
      return transfer.direction === "incoming" && transfer.id === metadata.id;
    });
    const nextTransfer: TransferItem = {
      direction: "incoming",
      errorReason,
      id: metadata.id,
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
    if (signal.aborted) return;
    cancelProgressUpdate(session, progressKey);
    updateOutgoingTransfer(setTransfers, sharedFile.id, { progress: 1, status: "complete" });
  } catch {
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
