"use client";

import { UsersIcon } from "@workspace/icons/users-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { Textarea } from "@workspace/ui/components/textarea";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { PairingState } from "./types";

import { copyText } from "../../lib/copy-text";
import { PairingCode } from "./pairing-code";

type ConnectionPath = "choose" | "join";
type DeliveryState = "copied" | "idle" | "shared";

export interface PairingPanelProps {
  connectionError: string;
  onAcceptAnswer: (code: string) => Promise<void>;
  onAcceptInvite: (code: string) => Promise<void>;
  onCancel: () => void;
  onCreateInvite: () => Promise<void>;
  pairingCode: string;
  pairingState: PairingState;
  peerCount: number;
}

export function PairingPanel({
  connectionError,
  onAcceptAnswer,
  onAcceptInvite,
  onCancel,
  onCreateInvite,
  pairingCode,
  pairingState,
  peerCount,
}: PairingPanelProps) {
  const [answerCode, setAnswerCode] = useState("");
  const [connectionPath, setConnectionPath] = useState<ConnectionPath>("choose");
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("idle");
  const [inviteCode, setInviteCode] = useState("");
  const previousPairingState = useRef(pairingState);

  useEffect(
    function resetCompletedPairingFlow() {
      const previousState = previousPairingState.current;
      previousPairingState.current = pairingState;
      if (pairingState !== "idle" || previousState === "idle") return;
      setAnswerCode("");
      setConnectionPath("choose");
      setDeliveryState("idle");
      setInviteCode("");
    },
    [pairingState],
  );

  async function handleSendCode() {
    if (navigator.share) {
      try {
        await navigator.share({ text: pairingCode, title: "Nearby Chat" });
        setDeliveryState("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    if (await copyText(pairingCode)) setDeliveryState("copied");
  }

  function handleAcceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeliveryState("idle");
    void onAcceptInvite(inviteCode);
  }

  function handleAcceptAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onAcceptAnswer(answerCode);
  }

  function handleCreateInvite() {
    setDeliveryState("idle");
    void onCreateInvite();
  }

  function handleCancel() {
    setAnswerCode("");
    setConnectionPath("choose");
    setDeliveryState("idle");
    setInviteCode("");
    onCancel();
  }

  const isBusy = pairingState === "creating" || pairingState === "connecting";

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <div
        className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3"
        aria-live="polite"
      >
        <span
          className={`size-2.5 rounded-full ${peerCount > 0 ? "bg-success" : "bg-muted-foreground/50"}`}
        />
        <UsersIcon className="size-4 text-muted-foreground" />
        <Text size="sm" weight="medium">
          {peerCount === 0
            ? "Ready to connect"
            : peerCount === 1
              ? "1 device connected"
              : `${peerCount} devices connected`}
        </Text>
      </div>

      {pairingState === "idle" ? (
        connectionPath === "choose" ? (
          <div className="grid gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-xl"
              onClick={handleCreateInvite}
            >
              Invite someone
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 rounded-xl"
              onClick={function showJoinStep() {
                setConnectionPath("join");
              }}
            >
              Join with an invite
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleAcceptInvite}>
            <label htmlFor="invite-code">
              <Text as="span" size="sm" weight="medium">
                Paste the invite you received
              </Text>
            </label>
            <Textarea
              id="invite-code"
              value={inviteCode}
              onChange={function updateInviteCode(event) {
                setInviteCode(event.currentTarget.value);
              }}
              placeholder="nearby1c.…"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              className="min-h-20 rounded-xl font-mono text-xs"
            />
            <Button
              type="submit"
              variant="secondary"
              className="h-12 rounded-xl"
              disabled={!inviteCode.trim()}
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={function showConnectionChoices() {
                setConnectionPath("choose");
              }}
            >
              Back
            </Button>
          </form>
        )
      ) : null}

      {pairingState === "answer" ? (
        <div className="flex flex-col gap-5">
          <PairingCode
            actionLabel="Send invite"
            code={pairingCode}
            deliveryState={deliveryState}
            instruction="Send this invite to the other person."
            onSend={handleSendCode}
          />
          <form
            className="flex flex-col gap-3 border-t border-border pt-5"
            onSubmit={handleAcceptAnswer}
          >
            <label htmlFor="answer-code">
              <Text as="span" size="sm" weight="medium">
                Paste their reply
              </Text>
            </label>
            <Textarea
              id="answer-code"
              value={answerCode}
              onChange={function updateAnswerCode(event) {
                setAnswerCode(event.currentTarget.value);
              }}
              placeholder="nearby1c.…"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              className="min-h-20 rounded-xl font-mono text-xs"
            />
            <Button type="submit" className="h-12 rounded-xl" disabled={!answerCode.trim()}>
              Connect
            </Button>
          </form>
        </div>
      ) : null}

      {pairingState === "share" ? (
        <div className="flex flex-col gap-4">
          <PairingCode
            actionLabel="Send reply"
            code={pairingCode}
            deliveryState={deliveryState}
            instruction="Send this reply to the person who invited you."
            onSend={handleSendCode}
          />
          <Text size="sm" tone="muted">
            Keep this page open while they connect.
          </Text>
        </div>
      ) : null}

      {isBusy ? (
        <div className="flex min-h-24 items-center justify-center" role="status">
          <Text size="sm" tone="muted">
            {pairingState === "creating" ? "Preparing a private connection…" : "Connecting…"}
          </Text>
        </div>
      ) : null}

      {pairingState !== "idle" ? (
        <Button type="button" variant="ghost" onClick={handleCancel}>
          Cancel pairing
        </Button>
      ) : null}

      {connectionError ? (
        <Text size="sm" tone="destructive" role="alert">
          {connectionError}
        </Text>
      ) : null}
    </div>
  );
}
