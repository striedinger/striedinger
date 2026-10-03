"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { LockIcon } from "@workspace/icons/lock-icon";
import { ShareIcon } from "@workspace/icons/share-icon";
import { UsersIcon } from "@workspace/icons/users-icon";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useState, type FormEvent } from "react";

import type { DropLabels } from "./types";

import { formatRoomCode, normalizeRoomCode } from "./room-code";

interface RoomPanelProps {
  connectionError: boolean;
  copied: boolean;
  copyFailed: boolean;
  labels: DropLabels;
  onCopy: () => void;
  onJoin: (roomCode: string) => boolean;
  onShare: () => void;
  peerCount: number;
  roomCode?: string;
}

export function RoomPanel({
  connectionError,
  copied,
  copyFailed,
  labels,
  onCopy,
  onJoin,
  onShare,
  peerCount,
  roomCode,
}: RoomPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeInvalid, setJoinCodeInvalid] = useState(false);

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const joined = onJoin(joinCode);
    setJoinCodeInvalid(!joined);
  }

  return (
    <Surface className="flex min-w-0 flex-col gap-6 rounded-3xl p-6 hover:border-primary/20 hover:shadow-raised sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Text as="h2" size="xl" weight="semibold">
            {labels.roomCode}
          </Text>
          <Text size="sm" tone="muted">
            {labels.shareHint}
          </Text>
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          title={labels.encrypted}
        >
          <LockIcon className="size-4" />
          <span className="sr-only">{labels.encrypted}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface-inset p-4 text-center shadow-inner transition-colors duration-200 hover:border-primary/25 motion-reduce:transition-none">
        <Text
          as="output"
          family="mono"
          size="xl"
          weight="semibold"
          className="tracking-[0.12em] break-all sm:text-2xl"
          aria-live="polite"
          aria-atomic="true"
          aria-label={labels.roomCode}
        >
          {roomCode ? formatRoomCode(roomCode) : labels.preparing}
        </Text>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11"
        onClick={onCopy}
        disabled={!roomCode}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? labels.copied : labels.copyLink}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="h-11"
        onClick={onShare}
        disabled={!roomCode}
      >
        <ShareIcon />
        {labels.share}
      </Button>

      {copyFailed ? (
        <Text size="sm" tone="destructive" role="alert">
          {labels.copyFailed}
        </Text>
      ) : null}

      <div
        className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3 transition-colors duration-200 hover:bg-secondary/80 motion-reduce:transition-none"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="relative flex size-2.5" aria-hidden="true">
          {peerCount > 0 ? (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
          ) : null}
          <span
            className={`relative inline-flex size-2.5 rounded-full ${peerCount > 0 ? "bg-success" : "bg-muted-foreground/50"}`}
          />
        </span>
        <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <Text size="sm" weight="medium">
          {peerCount === 0
            ? labels.noPeers
            : peerCount === 1
              ? labels.onePeer
              : labels.peers.replace("{count}", String(peerCount))}
        </Text>
      </div>

      {connectionError ? (
        <Text size="sm" tone="destructive" role="alert">
          {labels.roomError}
        </Text>
      ) : null}

      <div className="border-t border-border pt-6">
        <form className="flex flex-col gap-3" onSubmit={handleJoin}>
          <label htmlFor="join-code">
            <Text as="span" size="sm" weight="medium">
              {labels.joinHint}
            </Text>
          </label>
          <div className="flex gap-2">
            <Input
              id="join-code"
              value={joinCode}
              onChange={function updateJoinCode(event) {
                setJoinCode(
                  formatRoomCode(normalizeRoomCode(event.currentTarget.value)).slice(0, 19),
                );
                setJoinCodeInvalid(false);
              }}
              placeholder={labels.joinCode}
              aria-invalid={joinCodeInvalid}
              aria-describedby={joinCodeInvalid ? "join-code-error" : undefined}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono tracking-wide"
            />
            <Button type="submit" variant="secondary" className="h-11 px-5">
              {labels.join}
            </Button>
          </div>
          {joinCodeInvalid ? (
            <Text id="join-code-error" size="sm" tone="destructive" role="alert">
              {labels.invalidCode}
            </Text>
          ) : null}
        </form>
      </div>
    </Surface>
  );
}
