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
        <li className="after:bg-ios-separator relative px-4 py-3.5 after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50">
          <Text
            as="output"
            family="mono"
            aria-live="polite"
            aria-atomic="true"
            aria-label={labels.roomCode}
            className="text-ios-label block text-center text-[22px] leading-7 font-semibold tracking-[0.12em] break-all"
          >
            {roomCode ? formatRoomCode(roomCode) : labels.preparing}
          </Text>
        </li>
        <li>
          <button
            type="button"
            disabled={!roomCode}
            className="text-ios-body text-ios-tint focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed disabled:text-ios-tertiary-label flex min-h-[48px] w-full items-center gap-3 px-4 text-left transition-colors duration-150 outline-none select-none motion-reduce:transition-none [&_svg]:size-5"
            onClick={onCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? labels.copied : labels.copyLink}
          </button>
        </li>
      </IosListSection>
      {copyFailed ? (
        <Text role="alert" className="text-ios-footnote text-ios-red px-9">
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
              className="text-ios-label placeholder:text-ios-tertiary-label min-w-0 flex-1 bg-transparent py-3 font-mono text-[17px] tracking-wide outline-none"
            />
            <button
              type="submit"
              className="bg-ios-tint focus-visible:ring-ios-tint/50 h-8 shrink-0 rounded-full px-4 text-[15px] font-semibold text-white outline-none focus-visible:ring-2 active:opacity-70"
            >
              {labels.join}
            </button>
          </li>
        </IosListSection>
        {joinCodeInvalid ? (
          <Text
            id="join-code-error"
            role="alert"
            className="text-ios-footnote text-ios-red px-9 pt-2"
          >
            {labels.invalidCode}
          </Text>
        ) : null}
      </form>
    </>
  );
}
