import type { IconProps } from "./icon-props";

export function QuoteIcon(props: IconProps) {
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
      <path d="M5 4.5v15M10 7h10M10 12h10M10 17h6" />
    </svg>
  );
}
