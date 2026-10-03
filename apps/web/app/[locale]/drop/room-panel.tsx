"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { Text } from "@workspace/ui/components/text";
import { useState, type FormEvent } from "react";

import type { DropLabels } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { formatRoomCode, normalizeRoomCode } from "./room-code";

interface RoomPanelProps {
  copied: boolean;
  copyFailed: boolean;
  labels: DropLabels;
  onCopy: () => void;
  onJoin: (roomCode: string) => boolean;
  roomCode?: string;
}

/** The room code to share, and a field to join another device's room, as grouped lists. */
export function RoomPanel({
  copied,
  copyFailed,
  labels,
  onCopy,
  onJoin,
  roomCode,
}: RoomPanelProps) {
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeInvalid, setJoinCodeInvalid] = useState(false);

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinCodeInvalid(!onJoin(joinCode));
  }

  return (
    <>
      <IosListSection
        header={labels.roomCode}
        footer={copyFailed ? undefined : labels.shareHint}
        label={labels.roomCode}
      >
        <li className="relative px-4 py-3.5 after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50 after:bg-(--ios-separator)">
          <Text
            as="output"
            family="mono"
            aria-live="polite"
            aria-atomic="true"
            aria-label={labels.roomCode}
            className="block text-center text-[22px] leading-7 font-semibold tracking-[0.12em] break-all text-(--ios-label)"
          >
            {roomCode ? formatRoomCode(roomCode) : labels.preparing}
          </Text>
        </li>
        <li>
          <button
            type="button"
            disabled={!roomCode}
            className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-tint) transition-colors duration-150 outline-none select-none focus-visible:bg-(--ios-fill) active:bg-(--ios-grouped-cell-pressed) disabled:text-(--ios-tertiary-label) motion-reduce:transition-none [&_svg]:size-5"
            onClick={onCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? labels.copied : labels.copyLink}
          </button>
        </li>
      </IosListSection>
      {copyFailed ? (
        <Text role="alert" className="px-9 text-[13px] leading-[18px] text-(--ios-red)">
          {labels.copyFailed}
        </Text>
      ) : null}
      <form onSubmit={handleJoin}>
        <IosListSection header={labels.joinHint}>
          <li className="flex min-h-[48px] items-center gap-2 pr-2 pl-4">
            <label htmlFor="join-code" className="sr-only">
              {labels.joinHint}
            </label>
            <input
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
              className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[17px] tracking-wide text-(--ios-label) outline-none placeholder:text-(--ios-tertiary-label)"
            />
            <button
              type="submit"
              className="h-8 shrink-0 rounded-full bg-(--ios-tint) px-4 text-[15px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:opacity-70"
            >
              {labels.join}
            </button>
          </li>
        </IosListSection>
        {joinCodeInvalid ? (
          <Text
            id="join-code-error"
            role="alert"
            className="px-9 pt-2 text-[13px] leading-[18px] text-(--ios-red)"
          >
            {labels.invalidCode}
          </Text>
        ) : null}
      </form>
    </>
  );
}
