import type { IconProps } from "./icon-props";

export function ComposeIcon(props: IconProps) {
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
      <path d="M11 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V13" />
      <path d="M18.4 2.9a2.05 2.05 0 0 1 2.9 2.9l-9.1 9.1-3.7.8.8-3.7Z" />
    </svg>
  );
}
