"use client";

import { cn } from "@workspace/ui/lib/utils";
import { useFormStatus } from "react-dom";

import { iosFilledButtonClassName } from "./ios-button-styles";

interface IosSubmitButtonProps {
  checkingLabel: string;
  label: string;
}

/** A full-width filled capsule that submits its form and shows a spinner while pending. */
export function IosSubmitButton({ checkingLabel, label }: IosSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(iosFilledButtonClassName, "w-full")}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
        />
      ) : null}
      {pending ? checkingLabel : label}
    </button>
  );
}
