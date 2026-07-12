import type { IconProps } from "./icon-props";

export function RefreshIcon(props: IconProps) {
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
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.4 6.4L4 9" />
      <path d="M5.5 15a7 7 0 0 0 12.1 2.6L20 15" />
    </svg>
  );
}
