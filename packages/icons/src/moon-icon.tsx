import type { IconProps } from "./icon-props";

export function MoonIcon(props: IconProps) {
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
      <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.3 8.3 0 1 0 10.6 10.6Z" />
    </svg>
  );
}
