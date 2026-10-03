import type { IconProps } from "./icon-props";

export function ArrowUpDownIcon(props: IconProps) {
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
      <path d="M7 20V4M3.5 7.5 7 4l3.5 3.5M17 4v16M13.5 16.5 17 20l3.5-3.5" />
    </svg>
  );
}
