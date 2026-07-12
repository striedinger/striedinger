"use client";

import { Button } from "@workspace/ui/components/button";
import { useFormStatus } from "react-dom";

interface OgSubmitButtonProps {
  checkingLabel: string;
  disabled?: boolean;
  label: string;
}

export function OgSubmitButton({ checkingLabel, disabled, label }: OgSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-11 shrink-0 rounded-xl px-5"
      type="submit"
      disabled={disabled}
      loading={pending}
      loadingLabel={checkingLabel}
    >
      {label}
    </Button>
  );
}
