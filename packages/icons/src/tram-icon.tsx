import type { IconProps } from "./icon-props";

export function TramIcon(props: IconProps) {
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
      <rect x="6" y="3.5" width="12" height="13.5" rx="3.5" />
      <path d="M6 10.5h12" />
      <path d="M9 13.8h.01M15 13.8h.01" />
      <path d="m8.5 17-2 3.5M15.5 17l2 3.5" />
    </svg>
  );
}
