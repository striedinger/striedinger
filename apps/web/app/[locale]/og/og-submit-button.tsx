"use client";

import { useFormStatus } from "react-dom";

interface OgSubmitButtonProps {
  checkingLabel: string;
  label: string;
}

export function OgSubmitButton({ checkingLabel, label }: OgSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-(--ios-tint) px-6 text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-white transition-[transform,opacity] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 focus-visible:ring-offset-2 focus-visible:ring-offset-(--ios-grouped-background) active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100 motion-reduce:transition-none"
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
