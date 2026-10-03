import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

interface NotesToolbarProps {
  children: ReactNode;
  className?: string;
  label: string;
}

/** The translucent bottom toolbar that sits above the home indicator or software keyboard. */
export function NotesToolbar({ children, className, label }: NotesToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex min-h-11 translate-y-[calc(-1*var(--keyboard-inset,0px))] items-center justify-between gap-2 bg-(--ios-chrome) px-2 pt-0.5 pb-[max(env(safe-area-inset-bottom),2px)] shadow-[0_-0.5px_0_var(--ios-separator)] backdrop-blur-xl backdrop-saturate-180",
        className,
      )}
    >
      {children}
    </div>
  );
}
