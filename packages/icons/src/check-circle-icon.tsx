import type { IconProps } from "./icon-props";

export function CheckCircleIcon(props: IconProps) {
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
      <circle cx="12" cy="12" r="9.5" />
      <path d="m7.8 12.3 2.8 2.8 5.6-5.8" />
    </svg>
  );
}
