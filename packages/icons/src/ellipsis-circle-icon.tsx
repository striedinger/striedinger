import type { IconProps } from "./icon-props";

export function EllipsisCircleIcon(props: IconProps) {
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
      <circle cx="7.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
