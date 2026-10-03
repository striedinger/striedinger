import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

interface NotesToolbarProps {
  children: ReactNode;
  className?: string;
  label: string;
}

/**
 * The floating iOS 26 bottom toolbar: glass controls hover over content with a soft scroll
 * edge behind them, and the whole bar rides above the software keyboard. On phones, where one
 * pane shows at a time, the toolbar stays in place while panes push and pop beneath it, and
 * its controls cross-fade, like a navigation controller's toolbar.
 */
export function NotesToolbar({ children, className, label }: NotesToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex translate-y-[calc(-1*var(--keyboard-inset,0px))] items-center gap-2.5 px-4 pt-8 pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),14px)] max-md:[view-transition-class:ios-toolbar] max-md:[view-transition-name:notes-toolbar] [&>*]:pointer-events-auto",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-linear-to-t before:from-[var(--ios-bar-edge,var(--ios-background))] before:from-30% before:to-transparent before:[mask-image:linear-gradient(to_top,black_50%,transparent)] before:backdrop-blur-[3px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
