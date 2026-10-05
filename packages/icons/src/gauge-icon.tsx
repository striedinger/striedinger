import type { IconProps } from "./icon-props";

export function GaugeIcon(props: IconProps) {
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
      <path d="M4.2 17.5a9 9 0 1 1 15.6 0" />
      <path d="m12 13.5 3.8-4.3" />
      <circle cx="12" cy="13.5" r="1.4" />
    </svg>
  );
}
