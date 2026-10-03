import type { IconProps } from "./icon-props";

export function IndentIncreaseIcon(props: IconProps) {
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
      <path d="M4 5h16M11 10h9M11 14h9M4 19h16M4 9.5 7 12l-3 2.5" />
    </svg>
  );
}
