import type { ReactNode } from "react";

interface NoteFormatIconButtonProps {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}

export function NoteFormatIconButton({
  children,
  disabled = false,
  label,
  onClick,
  pressed,
}: NoteFormatIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className="text-ios-label not-last:border-ios-separator focus-visible:bg-ios-fill disabled:text-ios-tertiary-label aria-pressed:bg-ios-tint flex h-11 items-center justify-center outline-none not-last:border-r-[0.5px] aria-pressed:text-black [&_svg]:size-[22px]"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
