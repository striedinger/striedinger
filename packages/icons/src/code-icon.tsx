import type { IconProps } from "./icon-props";

export function CodeIcon(props: IconProps) {
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
      <path d="m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5" />
    </svg>
  );
}
