import type { IconProps } from "./icon-props";

export function GoForwardIcon(props: IconProps) {
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
      <path d="M19.4 7.6A8.5 8.5 0 1 1 12 3.5h1.2" />
      <path d="m11 1.2 2.4 2.3L11 5.8" />
    </svg>
  );
}
