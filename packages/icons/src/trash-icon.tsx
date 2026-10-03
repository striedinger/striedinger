import type { IconProps } from "./icon-props";

export function TrashIcon(props: IconProps) {
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
      <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6 6.5l.9 12.6A2 2 0 0 0 8.9 21h6.2a2 2 0 0 0 2-1.9L18 6.5M10 10.5v6.5M14 10.5v6.5" />
    </svg>
  );
}
