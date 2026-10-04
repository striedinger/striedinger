"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { useState } from "react";

import { copyText } from "../../../lib/copy-text";

interface CopyIpAddressButtonProps {
  /** The address to copy, or `null` when the server could not observe one. */
  ipAddress: string | null;
  labels: {
    copied: string;
    copyIpAddress: string;
  };
}

/** A tinted list-row button that copies the observed address and briefly confirms it. */
export function CopyIpAddressButton({ ipAddress, labels }: CopyIpAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyIpAddress() {
    if (!ipAddress || !(await copyText(ipAddress))) {
      return;
    }

    setCopied(true);
    window.setTimeout(function resetCopied() {
      setCopied(false);
    }, 2_000);
  }

  return (
    <button
      type="button"
      disabled={!ipAddress}
      className="flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-tint) transition-colors duration-150 outline-none select-none focus-visible:bg-(--ios-fill) active:bg-(--ios-grouped-cell-pressed) disabled:text-(--ios-tertiary-label) motion-reduce:transition-none [&_svg]:size-5"
      onClick={copyIpAddress}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{copied ? labels.copied : labels.copyIpAddress}</span>
    </button>
  );
}
