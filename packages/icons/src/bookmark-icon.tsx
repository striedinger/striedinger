import type { IconProps } from "./icon-props";

export function BookmarkIcon(props: IconProps) {
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
      <path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9Z" />
    </svg>
  );
}
