"use client";

import { LockIcon } from "@workspace/icons/lock-icon";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";
import { useState, type FormEvent } from "react";

import { DeviceDrawer } from "./device-drawer";
import { MessageList } from "./message-list";
import { useNearbyChat } from "./use-nearby-chat";

export function ChatTool() {
  const [draft, setDraft] = useState("");
  const chat = useNearbyChat();

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const didSend = await chat.sendMessage(draft, Date.now());
    if (didSend) setDraft("");
  }

  return (
    <section
      className="mx-auto flex h-[calc(100svh-11rem)] min-h-[32rem] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-surface sm:h-[min(46rem,calc(100svh-12rem))]"
      aria-labelledby="chat-room-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-col">
          <Text as="h2" id="chat-room-title" size="lg" weight="semibold">
            Nearby chat
          </Text>
          <Text size="xs" tone="muted" className="truncate">
            You’re {chat.alias}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 text-success sm:flex">
            <LockIcon className="size-4" />
            <Text as="span" size="xs" weight="medium" className="text-current">
              Local only
            </Text>
          </div>
          <DeviceDrawer
            connectionError={chat.connectionError}
            onAcceptAnswer={chat.acceptAnswer}
            onAcceptInvite={chat.acceptInvite}
            onCancel={chat.cancelPairing}
            onCreateInvite={chat.createInvite}
            pairingCode={chat.pairingCode}
            pairingState={chat.pairingState}
            peerCount={chat.peerCount}
          />
        </div>
      </div>

      <MessageList messages={chat.messages} />

      <form
        className="flex gap-2 border-t border-border bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4"
        onSubmit={handleSend}
      >
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <Input
          id="chat-message"
          value={draft}
          onChange={function updateDraft(event) {
            setDraft(event.currentTarget.value.slice(0, 2_000));
          }}
          placeholder={chat.peerCount > 0 ? "Message nearby…" : "Connect a device to chat"}
          autoComplete="off"
          disabled={chat.peerCount === 0}
          maxLength={2_000}
          className="h-12 rounded-xl"
        />
        <Button
          type="submit"
          size="lg"
          disabled={chat.peerCount === 0 || !draft.trim()}
          className="h-12 rounded-xl px-5"
        >
          Send
        </Button>
      </form>
    </section>
  );
}
