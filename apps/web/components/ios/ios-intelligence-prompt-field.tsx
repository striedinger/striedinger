"use client";

import type { FormEvent } from "react";

import { ArrowUpIcon } from "@workspace/icons/arrow-up-icon";
import { useState } from "react";

interface IosIntelligencePromptFieldProps {
  disabled?: boolean;
  label: string;
  onSubmit: (request: string) => void;
  placeholder: string;
  submitLabel: string;
}

/** A capsule field for asking on-device AI for something, sent with the arrow or Return. */
export function IosIntelligencePromptField({
  disabled = false,
  label,
  onSubmit,
  placeholder,
  submitLabel,
}: IosIntelligencePromptFieldProps) {
  const [request, setRequest] = useState("");
  const trimmedRequest = request.trim();

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedRequest || disabled) return;
    onSubmit(trimmedRequest);
  }

  return (
    <form
      onSubmit={submitRequest}
      className="flex h-11 items-center gap-1 rounded-full bg-ios-fill py-1 pr-1 pl-4 focus-within:ring-2 focus-within:ring-ios-tint/35"
    >
      <input
        type="text"
        value={request}
        onChange={function updateRequest(event) {
          setRequest(event.currentTarget.value);
        }}
        aria-label={label}
        placeholder={placeholder}
        maxLength={500}
        enterKeyHint="send"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-ios-body text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label"
      />
      <button
        type="submit"
        aria-label={submitLabel}
        disabled={!trimmedRequest || disabled}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ios-tint text-white transition-[transform,opacity] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:scale-90 disabled:opacity-30 disabled:active:scale-100 motion-reduce:transition-none dark:text-black [&_svg]:size-4.5"
      >
        <ArrowUpIcon strokeWidth={2.6} />
      </button>
    </form>
  );
}
