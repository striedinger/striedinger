import type { IconProps } from "./icon-props";

export function ChecklistIcon(props: IconProps) {
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
      <circle cx="6" cy="7" r="2.75" />
      <circle cx="6" cy="17" r="2.75" />
      <path d="M11.5 7H21M11.5 17H21" />
    </svg>
  );
}
