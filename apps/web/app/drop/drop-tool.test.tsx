import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DropLabels } from "./types";

import { DropTool } from "./drop-tool";
import { maximumFileSizeBytes } from "./transfer-limits";

const peerState = vi.hoisted(function createPeerState() {
  const action = {
    onMessage: null,
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
  noFiles: "No files",
  noPeers: "Waiting for another device",
  onePeer: "1 device connected",
  peers: "{count} devices connected",
  preparing: "Preparing",
  privacy: "Private",
  roomCode: "Room",
  roomError: "Error",
  retry: "Retry",
  selectFiles: "Select files",
  sending: "Sending",
  share: "Share invite",
  shareHint: "Share this",
  title: "Drop",
  transferFailed: "Transfer failed",
  waiting: "Ready to send",
};

beforeEach(function resetPeerState() {
  vi.stubGlobal("RTCPeerConnection", MockRTCPeerConnection);
  window.history.replaceState(null, "", "/drop");
  peerState.action.send.mockReset();
  peerState.action.send.mockImplementation(function sendFile() {
    return Promise.resolve();
  });
  peerState.room.onPeerJoin = null;
  peerState.room.onPeerLeave = null;
  for (const peerId of Object.keys(peerState.peers)) delete peerState.peers[peerId];
});

afterEach(function cleanUpDropTool() {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DropTool", function () {
  it("queues selected files and sends them when a device connects", async function () {
    render(<DropTool labels={labels} />);

    await waitFor(function waitForRoom() {
      expect(screen.queryByText(labels.preparing)).not.toBeInTheDocument();
    });
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(screen.getByText(file.name)).toBeInTheDocument();
    expect(screen.getByText(/Ready to send/)).toBeInTheDocument();

    await waitFor(function waitForPeerHandler() {
      expect(peerState.room.onPeerJoin).toBeTypeOf("function");
    });
    await act(async function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });

    expect(peerState.action.send).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ target: ["peer-1"] }),
    );
    await waitFor(function waitForTransfer() {
      expect(screen.getByText(/Sent directly/)).toBeInTheDocument();
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
    await act(async function connectPeerInNewRoom() {
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
    await act(async function connectPeer() {
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
    await act(async function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    selectFiles([new File(["one"], "one.txt"), new File(["two"], "two.txt")]);

    await waitFor(function waitForFirstTransfer() {
      expect(peerState.action.send).toHaveBeenCalledTimes(1);
    });
    await act(async function completeFirstTransfer() {
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
    await act(async function connectPeer() {
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
      const receiveMessage = peerState.action.onMessage as unknown as (
        data: ArrayBuffer,
        context: { metadata: unknown; peerId: string },
      ) => void;
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
        url: expect.stringMatching(new RegExp(`^${window.location.origin}/drop#[A-Z0-9-]+$`)),
      });
    });
  });

  it("exposes throttled transfer progress with progressbar semantics", async function () {
    let finishTransfer: (() => void) | undefined;
    peerState.action.send.mockImplementationOnce(function reportProgress(_data, options) {
      (options as { onProgress?: (progress: number) => void })?.onProgress?.(0.42);
      return new Promise<void>(function waitForResolution(resolve) {
        finishTransfer = resolve;
      });
    });
    render(<DropTool labels={labels} />);
    await waitForForRoom();
    await act(async function connectPeer() {
      peerState.room.onPeerJoin?.("peer-1");
    });
    selectFiles([new File(["progress"], "progress.txt")]);

    const progressbar = await screen.findByRole("progressbar", {
      name: `${labels.sending} progress.txt`,
    });
    await waitFor(function waitForThrottledProgress() {
      expect(progressbar).toHaveAttribute("aria-valuenow", "42");
    });
    await act(async function completeTransfer() {
      finishTransfer?.();
    });
  });
});

async function waitForForRoom() {
  await waitFor(function waitForRoom() {
    expect(screen.queryByText(labels.preparing)).not.toBeInTheDocument();
  });
  await waitFor(function waitForPeerHandler() {
    expect(peerState.room.onPeerJoin).toBeTypeOf("function");
  });
}

function selectFiles(files: File[]) {
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(fileInput).not.toBeNull();
  fireEvent.change(fileInput as HTMLInputElement, { target: { files } });
}

function MockRTCPeerConnection() {}
