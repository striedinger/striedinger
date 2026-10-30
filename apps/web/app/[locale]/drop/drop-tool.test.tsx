import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DropLabels } from "./types";

import { DropTool } from "./drop-tool";
import {
  maximumFileSizeBytes,
  maximumSessionReceiveBytes,
  maximumSessionReceiveFiles,
} from "./transfer-limits";

const peerState = vi.hoisted(function createPeerState() {
  const action = {
    onMessage: null,
    onReceive: null,
    onReceiveProgress: null,
    send: vi.fn<(data?: unknown, options?: unknown) => Promise<void>>(function sendFile() {
      return Promise.resolve();
    }),
  };
  const peers: Record<string, RTCPeerConnection> = {};
  const room = {
    getPeers: vi.fn<() => Record<string, RTCPeerConnection>>(function getPeers() {
      return peers;
    }),
    leave: vi.fn<() => Promise<void>>(function leave() {
      return Promise.resolve();
    }),
    makeAction: vi.fn<() => typeof action>(function makeAction() {
      return action;
    }),
    onPeerJoin: null as null | ((peerId: string) => void),
    onPeerLeave: null as null | ((peerId: string) => void),
  };

  return { action, peers, room };
});

vi.mock("trystero", function mockTrystero() {
  return {
    joinRoom: vi.fn<() => typeof peerState.room>(function joinRoom() {
      return peerState.room;
    }),
  };
});

vi.mock("./room-code", async function mockRoomCode(importOriginal) {
  const original = await importOriginal<typeof import("./room-code")>();
  return {
    ...original,
    deriveRoomId: vi.fn<() => Promise<string>>(function deriveRoomId() {
      return Promise.resolve("derived-room-id");
    }),
  };
});

const labels: DropLabels = {
  addFiles: "Add files",
  availableFiles: "Files",
  copied: "Copied",
  copyFailed: "Copy failed",
  copyLink: "Copy link",
  description: "Description",
  directConnection: "Sent directly",
  download: "Download",
  dropFiles: "Drop to share",
  dropHint: "Drop files here",
  encrypted: "Encrypted",
  fileInvalid: "Invalid file",
  fileReady: "1 file",
  fileTooLarge: "File too large",
  filesReady: "{count} files",
  join: "Join",
  joinCode: "Code",
  joinHint: "Have a code?",
  invalidCode: "Invalid room code",
  latePeerHint: "Earlier files are not sent automatically",
  latePeerJoined: "A new device joined",
  noFiles: "No files",
  noPeers: "Waiting for another device",
  notNow: "Not now",
  onePeer: "1 device connected",
  peers: "{count} devices connected",
  preparing: "Preparing",
  privacy: "Private",
  roomCode: "Room",
  roomError: "Error",
  retry: "Retry",
  selectFiles: "Select files",
  sendFiles: "Send {count} files",
  sending: "Sending",
  sendOneFile: "Send 1 file",
  sessionLimit: "Session limit reached",
  share: "Share invite",
  shareHint: "Share this",
  title: "Drop",
  transferFailed: "Transfer failed",
  waiting: "Ready to send",
};

beforeEach(function resetPeerState() {
  vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
  createdObjectUrlSources.length = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: function createObjectUrl(source: Blob) {
      createdObjectUrlSources.push(source);
      return `blob:drop/${createdObjectUrlSources.length}`;
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: ignoreRevokedObjectUrl,
  });
  window.history.replaceState(null, "", "/drop");
  peerState.action.send.mockReset();
  peerState.action.send.mockImplementation(function sendFile() {
    return Promise.resolve();
  });
  peerState.action.onMessage = null;
  peerState.action.onReceive = null;
  peerState.action.onReceiveProgress = null;
  peerState.room.onPeerJoin = null;
  peerState.room.onPeerLeave = null;
  for (const peerId of Object.keys(peerState.peers))
    Reflect.deleteProperty(peerState.peers, peerId);
});

afterEach(function cleanUpDropTool() {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DropTool", function () {
  it("asks before sending earlier files to a device that joins later", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    selectFiles([file]);

    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(screen.getByText(/Ready to send/)).toBeInTheDocument();

    await actAndSettle(function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });

    expect(peerState.action.send).not.toHaveBeenCalled();
    await actAndSettle(function confirmSend() {
      fireEvent.click(screen.getByRole("button", { name: labels.sendOneFile }));
    });

    expect(peerState.action.send).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ target: ["peer-1"] }),
    );
    expect(screen.queryByText(labels.latePeerJoined)).not.toBeInTheDocument();
    await waitFor(function waitForTransfer() {
      expect(screen.getByText(/Sent directly/)).toBeInTheDocument();
    });
  });

  it("sends only to the new device and keeps withheld files from it when dismissed", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    await actAndSettle(function connectFirstPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    const earlierFile = new File(["earlier"], "earlier.txt");
    selectFiles([earlierFile]);
    await waitFor(function waitForFirstSend() {
      expect(peerState.action.send).toHaveBeenCalledWith(
        earlierFile,
        expect.objectContaining({ target: ["peer-1"] }),
      );
    });

    await actAndSettle(function connectLatePeer() {
      peerState.room.onPeerJoin?.("peer-2");
    });
    fireEvent.click(screen.getByRole("button", { name: labels.notNow }));

    expect(screen.queryByText(labels.latePeerJoined)).not.toBeInTheDocument();
    expect(peerState.action.send).toHaveBeenCalledOnce();

    const laterFile = new File(["later"], "later.txt");
    selectFiles([laterFile]);
    await waitFor(function waitForBroadcast() {
      expect(peerState.action.send).toHaveBeenLastCalledWith(
        laterFile,
        expect.objectContaining({ target: ["peer-1", "peer-2"] }),
      );
    });
  });

  it("does not carry queued files into a different room", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    const file = new File(["private"], "private.txt", { type: "text/plain" });
    selectFiles([file]);

    const joinInput = screen.getByLabelText(labels.joinHint);
    fireEvent.change(joinInput, { target: { value: "ABCD-EFGH-JKMN-PQRS" } });
    fireEvent.click(screen.getByRole("button", { name: labels.join }));

    await waitFor(function waitForNewRoom() {
      expect(screen.queryByText(file.name)).not.toBeInTheDocument();
    });
    await actAndSettle(function connectPeerInNewRoom() {
      peerState.room.onPeerJoin?.("new-room-peer");
    });
    expect(peerState.action.send).not.toHaveBeenCalled();
  });

  it("rejects files larger than the browser memory limit", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    const oversizedFile = new File(["x"], "large.iso");
    Object.defineProperty(oversizedFile, "size", { value: maximumFileSizeBytes + 1 });
    selectFiles([oversizedFile]);

    expect(screen.getByText(labels.fileTooLarge, { exact: false })).toBeInTheDocument();
    await actAndSettle(function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    expect(peerState.action.send).not.toHaveBeenCalled();
  });

  it("serializes multiple files instead of buffering them concurrently", async function () {
    let finishFirstTransfer: (() => void) | undefined;
    peerState.action.send
      .mockImplementationOnce(function holdFirstTransfer() {
        return new Promise<void>(function waitForResolution(resolve) {
          finishFirstTransfer = resolve;
        });
      })
      .mockImplementationOnce(function finishSecondTransfer() {
        return Promise.resolve();
      });
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    await actAndSettle(function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    selectFiles([new File(["one"], "one.txt"), new File(["two"], "two.txt")]);

    await waitFor(function waitForFirstTransfer() {
      expect(peerState.action.send).toHaveBeenCalledTimes(1);
    });
    await actAndSettle(function completeFirstTransfer() {
      finishFirstTransfer?.();
    });
    await waitFor(function waitForSecondTransfer() {
      expect(peerState.action.send).toHaveBeenCalledTimes(2);
    });
  });

  it("lets the user retry a failed transfer", async function () {
    peerState.action.send
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce();
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    await actAndSettle(function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    selectFiles([new File(["retry"], "retry.txt")]);

    expect(await screen.findByText(labels.transferFailed, { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `${labels.retry} retry.txt` }));

    await waitFor(function waitForRetry() {
      expect(peerState.action.send).toHaveBeenCalledTimes(2);
      expect(screen.getByText(labels.directConnection, { exact: false })).toBeInTheDocument();
    });
  });

  it("disconnects a peer that announces an oversized incoming file", async function () {
    const close = vi.fn<() => void>();
    peerState.peers["unsafe-peer"] = { close } as unknown as RTCPeerConnection;
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function reportUnsafeTransfer() {
      const receiveProgress = peerState.action.onReceiveProgress as unknown as (
        progress: number,
        context: { metadata: unknown; peerId: string },
      ) => void;
      receiveProgress(0.01, {
        metadata: {
          id: "unsafe-file",
          lastModified: 0,
          name: "huge.iso",
          size: maximumFileSizeBytes + 1,
          type: "application/octet-stream",
        },
        peerId: "unsafe-peer",
      });
    });

    expect(close).toHaveBeenCalledOnce();
    expect(screen.queryByText("huge.iso")).not.toBeInTheDocument();
  });

  it("rejects an incoming payload that does not match its declared size", async function () {
    const close = vi.fn<() => void>();
    peerState.peers["unsafe-peer"] = { close } as unknown as RTCPeerConnection;
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function receiveInvalidPayload() {
      receiveMessage(new ArrayBuffer(2), {
        metadata: {
          id: "invalid-file",
          lastModified: 0,
          name: "invalid.txt",
          size: 10,
          type: "text/plain",
        },
        peerId: "unsafe-peer",
      });
    });

    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByText(labels.fileInvalid, { exact: false })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `${labels.download} invalid.txt` }),
    ).not.toBeInTheDocument();
  });

  it("stores received files as downloads that cannot render as a page", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function receiveHtmlFile() {
      receiveMessage(new TextEncoder().encode("<script>alert(1)</script>"), {
        metadata: { ...createMetadata("page", 25), name: "page.html", type: "text/html" },
        peerId: "peer-1",
      });
    });

    expect(createdObjectUrlSources).toHaveLength(1);
    expect(createdObjectUrlSources[0]?.type).toBe("application/octet-stream");
    expect(screen.getByRole("link", { name: `${labels.download} page.html` })).toHaveAttribute(
      "download",
      "page.html",
    );
  });

  it("displays and downloads received files under a sanitized name", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function receiveSpoofedName() {
      receiveMessage(new Uint8Array(3), {
        metadata: { ...createMetadata("spoof", 3), name: "report\u202Efdp.exe" },
        peerId: "peer-1",
      });
    });

    const link = screen.getByRole("link", { name: `${labels.download} reportfdp.exe` });
    expect(link).toHaveAttribute("download", "reportfdp.exe");
    expect(screen.getByText("reportfdp.exe")).toBeInTheDocument();
  });

  it("keeps transfers from different peers apart when they reuse an id", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function receiveCollidingTransfers() {
      receiveMessage(new Uint8Array(1), {
        metadata: { ...createMetadata("same-id", 1), name: "first.txt" },
        peerId: "peer-1",
      });
      receiveMessage(new Uint8Array(1), {
        metadata: { ...createMetadata("same-id", 1), name: "second.txt" },
        peerId: "peer-2",
      });
    });

    expect(screen.getByRole("link", { name: `${labels.download} first.txt` })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${labels.download} second.txt` })).toBeInTheDocument();
  });

  it("refuses an oversized incoming file before it is buffered", async function () {
    const close = vi.fn<() => void>();
    peerState.peers["unsafe-peer"] = { close } as unknown as RTCPeerConnection;
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    let admitted: boolean | undefined;
    act(function announceOversizedFile() {
      admitted = admitIncomingFile(
        maximumFileSizeBytes + 1,
        { ...createMetadata("huge", maximumFileSizeBytes + 1), name: "huge.iso" },
        "unsafe-peer",
      );
    });

    expect(admitted).toBe(false);
    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByText(labels.fileTooLarge, { exact: false })).toBeInTheDocument();
  });

  it("refuses files beyond the session's file count limit", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    const decisions: boolean[] = [];
    act(function announceManyFiles() {
      for (let index = 0; index <= maximumSessionReceiveFiles; index += 1) {
        decisions.push(admitIncomingFile(1, createMetadata(`file-${index}`, 1), "peer-1"));
      }
    });

    expect(decisions.filter(Boolean)).toHaveLength(maximumSessionReceiveFiles);
    expect(decisions.at(-1)).toBe(false);
    expect(screen.getByText(labels.sessionLimit, { exact: false })).toBeInTheDocument();
  });

  it("disconnects a peer that keeps sending once the session is full", async function () {
    const close = vi.fn<() => void>();
    peerState.peers["persistent-peer"] = { close } as unknown as RTCPeerConnection;
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    act(function announcePastTheLimit() {
      for (let index = 0; index < maximumSessionReceiveFiles + 5; index += 1) {
        admitIncomingFile(1, createMetadata(`file-${index}`, 1), "persistent-peer");
      }
    });

    expect(screen.getAllByText(labels.sessionLimit, { exact: false })).toHaveLength(1);
    expect(close).toHaveBeenCalled();
  });

  it("refuses files beyond the session's total size limit", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    const fileCountAtLimit = maximumSessionReceiveBytes / maximumFileSizeBytes;

    const decisions: boolean[] = [];
    act(function announceLargeFiles() {
      for (let index = 0; index <= fileCountAtLimit; index += 1) {
        decisions.push(
          admitIncomingFile(
            maximumFileSizeBytes,
            createMetadata(`large-${index}`, maximumFileSizeBytes),
            "peer-1",
          ),
        );
      }
    });

    expect(decisions.filter(Boolean)).toHaveLength(fileCountAtLimit);
    expect(decisions.at(-1)).toBe(false);
    expect(screen.getByText(labels.sessionLimit, { exact: false })).toBeInTheDocument();
  });

  it("shows a connection error when WebRTC setup is unavailable", async function () {
    vi.unstubAllGlobals();
    render(<DropTool labels={labels} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(labels.roomError);
  });

  it("describes an invalid room code next to the input", async function () {
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    const joinInput = screen.getByLabelText(labels.joinHint);

    fireEvent.change(joinInput, { target: { value: "TOO-SHORT" } });
    fireEvent.click(screen.getByRole("button", { name: labels.join }));

    expect(joinInput).toHaveAttribute("aria-invalid", "true");
    expect(joinInput).toHaveAccessibleDescription(labels.invalidCode);
    expect(screen.getByRole("alert")).toHaveTextContent(labels.invalidCode);
  });

  it("opens the native share sheet with the private invite link", async function () {
    const share = vi.fn<Navigator["share"]>(function shareInvite() {
      return Promise.resolve();
    });
    vi.stubGlobal("navigator", { share });
    render(<DropTool labels={labels} />);
    await waitForForRoom();

    fireEvent.click(screen.getByRole("button", { name: labels.share }));

    await waitFor(function waitForShareSheet() {
      expect(share).toHaveBeenCalledWith({
        title: labels.title,
        text: labels.description,
        url: expect.stringMatching(
          new RegExp(`^${window.location.origin}/drop#[A-Z0-9-]+$`),
        ) as string,
      });
    });
  });

  it("exposes throttled transfer progress with progressbar semantics", async function () {
    let finishTransfer: (() => void) | undefined;
    peerState.action.send.mockImplementationOnce(function reportProgress(_data, options) {
      (options as { onProgress?: (progress: number) => void }).onProgress?.(0.42);
      return new Promise<void>(function waitForResolution(resolve) {
        finishTransfer = resolve;
      });
    });
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    await actAndSettle(function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    selectFiles([new File(["progress"], "progress.txt")]);

    const progressbar = await screen.findByRole("progressbar", {
      name: `${labels.sending} progress.txt`,
    });
    await waitFor(function waitForThrottledProgress() {
      expect(progressbar).toHaveAttribute("aria-valuenow", "42");
    });
    await actAndSettle(function completeTransfer() {
      finishTransfer?.();
    });
  });
});

interface ReceiveContext {
  metadata: unknown;
  peerId: string;
}

const createdObjectUrlSources: Blob[] = [];

function createMetadata(id: string, size: number) {
  return { id, lastModified: 0, name: `${id}.bin`, size, type: "application/octet-stream" };
}

function receiveMessage(data: ArrayBuffer | Uint8Array, context: ReceiveContext) {
  const onMessage = peerState.action.onMessage as unknown as (
    data: ArrayBuffer | Uint8Array,
    context: ReceiveContext,
  ) => void;
  onMessage(data, context);
}

function admitIncomingFile(byteLength: number, metadata: unknown, peerId: string) {
  const onReceive = peerState.action.onReceive as unknown as (context: {
    byteLength: number;
    kind: "message";
    metadata: unknown;
    peerId: string;
    signal: AbortSignal;
  }) => boolean;
  return onReceive({
    byteLength,
    kind: "message",
    metadata,
    peerId,
    signal: new AbortController().signal,
  });
}

async function waitForForRoom() {
  await waitFor(function waitForRoom() {
    expect(screen.queryByText(labels.preparing)).not.toBeInTheDocument();
  });
  await waitFor(function waitForPeerHandler() {
    expect(peerState.room.onPeerJoin).toBeTypeOf("function");
  });
}

// An async act callback makes act wait for the promise work it starts, such as queued sends.
async function actAndSettle(callback: () => void) {
  // oxlint-disable-next-line typescript/require-await -- Only an async callback selects act's asynchronous flushing.
  await act(async function runCallback() {
    callback();
  });
}

function selectFiles(files: File[]) {
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (fileInput === null) throw new Error("Expected the drop zone to render a file input");
  fireEvent.change(fileInput, { target: { files } });
}

function MockRTCPeerConnection() {}

function ignoreRevokedObjectUrl() {}
