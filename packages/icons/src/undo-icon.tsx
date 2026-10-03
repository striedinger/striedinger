import type { IconProps } from "./icon-props";

export function UndoIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M8.5 13.5 3.8 8.8l4.7-4.7" />
      <path d="M4.3 8.8h10.2a5.7 5.7 0 0 1 0 11.4H11" />
    </svg>
  );
}
