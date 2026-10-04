"use client";

import { useFormStatus } from "react-dom";

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
      className="bg-ios-tint text-ios-body focus-visible:ring-ios-tint/50 focus-visible:ring-offset-ios-grouped-background flex h-[50px] w-full items-center justify-center gap-2 rounded-full px-6 font-semibold text-white transition-[transform,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100 motion-reduce:transition-none"
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
