import type { IconProps } from "./icon-props";

/** The backspace key, like SF Symbols' delete.left. */
export function DeleteLeftIcon(props: IconProps) {
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
      <path d="M9.4 5h9.1A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5H9.4a2 2 0 0 1-1.5-.7L3 12l4.9-6.3A2 2 0 0 1 9.4 5Z" />
      <path d="m11.5 9.5 5 5m0-5-5 5" />
    </svg>
  );
}
