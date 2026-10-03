import type { IconProps } from "./icon-props";

export function TextFormatIcon(props: IconProps) {
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
      <path d="m2.5 19 5.5-14 5.5 14M4.6 13.8h6.8" />
      <path d="M21 19v-6.2a3 3 0 0 0-5.8-1M21 15.2c-4.1-.3-6 .6-6 2.2 0 1 .8 1.7 2 1.7 2 0 4-1.5 4-3.9" />
    </svg>
  );
}
