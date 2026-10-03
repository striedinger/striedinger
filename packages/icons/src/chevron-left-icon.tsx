import type { IconProps } from "./icon-props";

export function ChevronLeftIcon(props: IconProps) {
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
      <path d="M15 4.5 7.5 12l7.5 7.5" />
    </svg>
  );
}
