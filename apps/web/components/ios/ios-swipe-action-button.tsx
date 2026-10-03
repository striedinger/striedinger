import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface IosSwipeAction {
  colorClassName: string;
  icon: ReactNode;
  id: string;
  label: string;
  onSelect: () => void;
}

interface IosSwipeActionButtonProps {
  action: IosSwipeAction;
  hidden: boolean;
  onSelect: () => void;
}

export function IosSwipeActionButton({ action, hidden, onSelect }: IosSwipeActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={action.label}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center text-white outline-none focus-visible:brightness-110 [&_svg]:size-[22px] [&_svg]:shrink-0",
        action.colorClassName,
      )}
      onClick={onSelect}
    >
      {action.icon}
    </button>
  );
}
