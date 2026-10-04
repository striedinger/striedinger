"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { useState } from "react";

import { copyText } from "../../lib/copy-text";

interface IosCopyRowButtonProps {
  copiedLabel: string;
  label: string;
  /** The text to copy, or `null` to disable the row. */
  value: string | null;
}

/** A tinted list-row button that copies a value and briefly confirms it. */
export function IosCopyRowButton({ copiedLabel, label, value }: IosCopyRowButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value || !(await copyText(value))) return;
    setCopied(true);
    window.setTimeout(function resetCopied() {
      setCopied(false);
    }, 2_000);
  }

  return (
    <button
      type="button"
      disabled={!value}
      className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-ios-body text-ios-tint transition-colors duration-150 outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed disabled:text-ios-tertiary-label motion-reduce:transition-none [&_svg]:size-5"
      onClick={copyValue}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
