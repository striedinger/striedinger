"use client";

import { ArrowUpIcon } from "@workspace/icons/arrow-up-icon";
import { cn } from "@workspace/ui/lib/utils";
import { useState, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";

import type { ChatLabels } from "./types";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";

interface ChatComposerProps {
  disabled: boolean;
  labels: ChatLabels;
  onSend: (text: string) => Promise<boolean>;
}

const maximumMessageLength = 2_000;

/**
 * The Messages input bar: a glass text field with a round send button that floats over the
 * conversation, softened by a scroll edge, and rides above the software keyboard.
 */
export function ChatComposer({ disabled, labels, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const canSend = !disabled && draft.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    if (await onSend(draft)) setDraft("");
  }

  return (
    <form
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex translate-y-[calc(-1*var(--keyboard-inset,0px))] px-[max(1rem,calc((100%-var(--ios-content-width,100%))/2+1rem))] pt-6 pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),10px)] [&>*]:pointer-events-auto",
        iosBottomScrollEdgeClassName,
      )}
      onSubmit={handleSubmit}
    >
      <div
        className={cn(
          "flex min-h-11 w-full items-end gap-2 rounded-[22px] py-1 pr-1 pl-4",
          iosGlassClassName,
        )}
      >
        <label htmlFor="chat-message" className="sr-only">
          {labels.message}
        </label>
        <textarea
          id="chat-message"
          rows={1}
          value={draft}
          onChange={function updateDraft(event) {
            setDraft(event.currentTarget.value.slice(0, maximumMessageLength));
          }}
          onKeyDown={sendOnEnter}
          placeholder={disabled ? labels.connectToChat : labels.messageNearby}
          autoComplete="off"
          disabled={disabled}
          maxLength={maximumMessageLength}
          enterKeyHint="send"
          className="[field-sizing:content] max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-[7px] text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-label) outline-none placeholder:text-(--ios-secondary-label) disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          aria-label={labels.send}
          disabled={!canSend}
          onPointerDown={keepFieldFocused}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--ios-tint) text-white transition-[transform,background-color,color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/60 active:scale-90 disabled:bg-(--ios-fill) disabled:text-(--ios-tertiary-label) disabled:active:scale-100 motion-reduce:transition-none"
        >
          <ArrowUpIcon className="size-5" strokeWidth={2.6} />
        </button>
      </div>
    </form>
  );
}

function sendOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

// Tapping send keeps focus in the field, so the keyboard stays up between messages.
function keepFieldFocused(event: PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
}
