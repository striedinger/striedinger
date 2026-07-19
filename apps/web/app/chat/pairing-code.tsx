"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CopyIcon } from "@workspace/icons/copy-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { Textarea } from "@workspace/ui/components/textarea";

interface PairingCodeProps {
  actionLabel: string;
  code: string;
  deliveryState: "copied" | "idle" | "shared";
  instruction: string;
  onSend: () => void;
}

export function PairingCode({
  actionLabel,
  code,
  deliveryState,
  instruction,
  onSend,
}: PairingCodeProps) {
  const delivered = deliveryState !== "idle";
  const completedLabel = deliveryState === "shared" ? "Shared" : "Copied";

  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" weight="medium">
        {instruction}
      </Text>
      <Button type="button" className="h-12 rounded-xl" onClick={onSend} disabled={!code}>
        {delivered ? <CheckIcon /> : <CopyIcon />}
        {delivered ? completedLabel : actionLabel}
      </Button>
      <details className="group rounded-xl border border-border/80 bg-surface-inset px-3 py-2.5">
        <summary className="cursor-pointer text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          Show code
        </summary>
        <Textarea
          value={code}
          readOnly
          aria-label="One-time pairing code"
          className="mt-3 min-h-20 rounded-xl font-mono text-xs"
        />
      </details>
    </div>
  );
}
