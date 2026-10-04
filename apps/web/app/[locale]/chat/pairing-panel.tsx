"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { ChatLabels, PairingState } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { copyText } from "../../../lib/copy-text";
import { describeConnectedDevices } from "./device-status";
import { PairingButton } from "./pairing-button";
import { PairingCode } from "./pairing-code";
import { PairingTextField } from "./pairing-text-field";

type ConnectionPath = "choose" | "join";
type DeliveryState = "copied" | "idle" | "shared";

export interface PairingPanelProps {
  connectionError: string;
  labels: ChatLabels;
  onAcceptAnswer: (code: string) => Promise<void>;
  onAcceptInvite: (code: string) => Promise<void>;
  onCancel: () => void;
  onCreateInvite: () => Promise<void>;
  pairingCode: string;
  pairingState: PairingState;
  peerCount: number;
}

/** The steps that pair this browser with another, laid out as iOS grouped content. */
export function PairingPanel({
  connectionError,
  labels,
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
        await navigator.share({ text: pairingCode, title: labels.title });
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
    <div className="flex min-w-0 flex-col gap-6">
      <IosListSection className="px-0">
        <li className="flex min-h-11 items-center gap-3 px-4 py-2.75">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              peerCount > 0 ? "bg-ios-green" : "bg-ios-tertiary-label",
            )}
          />
          <Text aria-live="polite" className="text-ios-body text-ios-label">
            {describeConnectedDevices(labels, peerCount)}
          </Text>
        </li>
      </IosListSection>

      {pairingState === "idle" ? (
        connectionPath === "choose" ? (
          <div className="flex flex-col gap-3">
            <PairingButton onClick={handleCreateInvite}>{labels.inviteSomeone}</PairingButton>
            <PairingButton
              variant="tinted"
              onClick={function showJoinStep() {
                setConnectionPath("join");
              }}
            >
              {labels.joinWithInvite}
            </PairingButton>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleAcceptInvite}>
            <PairingTextField
              id="invite-code"
              label={labels.pasteInvite}
              onChange={setInviteCode}
              value={inviteCode}
            />
            <PairingButton type="submit" disabled={!inviteCode.trim()}>
              {labels.continue}
            </PairingButton>
            <PairingButton
              variant="plain"
              onClick={function showConnectionChoices() {
                setConnectionPath("choose");
              }}
            >
              {labels.back}
            </PairingButton>
          </form>
        )
      ) : null}

      {pairingState === "answer" ? (
        <div className="flex flex-col gap-6">
          <PairingCode
            actionLabel={labels.sendInvite}
            code={pairingCode}
            deliveryState={deliveryState}
            instruction={labels.sendInviteInstruction}
            labels={labels}
            onSend={handleSendCode}
          />
          <form className="flex flex-col gap-3" onSubmit={handleAcceptAnswer}>
            <PairingTextField
              id="answer-code"
              label={labels.pasteReply}
              onChange={setAnswerCode}
              value={answerCode}
            />
            <PairingButton type="submit" disabled={!answerCode.trim()}>
              {labels.connect}
            </PairingButton>
          </form>
        </div>
      ) : null}

      {pairingState === "share" ? (
        <PairingCode
          actionLabel={labels.sendReply}
          code={pairingCode}
          deliveryState={deliveryState}
          footer={labels.keepPageOpen}
          instruction={labels.sendReplyInstruction}
          labels={labels}
          onSend={handleSendCode}
        />
      ) : null}

      {isBusy ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-3" role="status">
          <span
            aria-hidden="true"
            className="size-6 animate-spin rounded-full border-[2.5px] border-ios-fill border-t-ios-secondary-label motion-reduce:animate-none"
          />
          <Text className="text-ios-subheadline text-ios-secondary-label">
            {pairingState === "creating" ? labels.preparingConnection : labels.connecting}
          </Text>
        </div>
      ) : null}

      {connectionError ? (
        <Text role="alert" className="px-5 text-ios-footnote text-ios-red">
          {connectionError}
        </Text>
      ) : null}

      {pairingState !== "idle" ? (
        <PairingButton variant="plain" onClick={handleCancel}>
          {labels.cancelPairing}
        </PairingButton>
      ) : null}
    </div>
  );
}
