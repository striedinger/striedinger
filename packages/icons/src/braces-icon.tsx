import type { IconProps } from "./icon-props";

export function BracesIcon(props: IconProps) {
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
      <path d="M8.5 4.5H8a2 2 0 0 0-2 2v3a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 6 14.5v3a2 2 0 0 0 2 2h.5" />
      <path d="M15.5 4.5h.5a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0-2.5 2.5v3a2 2 0 0 1-2 2h-.5" />
    </svg>
  );
}
