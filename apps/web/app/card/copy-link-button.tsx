"use client";

import { Button } from "@workspace/ui/components/button";
import { useEffect, useRef, useState } from "react";

interface CopyLinkButtonProps {
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(function cleanupOnUnmount() {
    return function cleanup() {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(function resetCopied() {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard access can be denied; leave the button state unchanged.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
