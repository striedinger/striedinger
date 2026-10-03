import type { IconProps } from "./icon-props";

export function KeyboardDismissIcon(props: IconProps) {
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
      <rect x="3" y="3.5" width="18" height="11.5" rx="2" />
      <path d="M7 7.5h.01M10.3 7.5h.01M13.7 7.5h.01M17 7.5h.01M8.5 11.2h7M9.5 18.5l2.5 2.5 2.5-2.5" />
    </svg>
  );
}
