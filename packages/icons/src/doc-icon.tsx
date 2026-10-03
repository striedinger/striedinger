import type { IconProps } from "./icon-props";

export function DocIcon(props: IconProps) {
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
      <path d="M13.5 3.5H8a2.5 2.5 0 0 0-2.5 2.5v12A2.5 2.5 0 0 0 8 20.5h8a2.5 2.5 0 0 0 2.5-2.5V8.5Z" />
      <path d="M13.5 3.5v5h5" />
    </svg>
  );
}
