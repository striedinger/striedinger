import type { IconProps } from "./icon-props";

export function ListDashIcon(props: IconProps) {
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
      <path d="M3 6h3.5M3 12h3.5M3 18h3.5M9.5 6H20M9.5 12H20M9.5 18H20" />
    </svg>
  );
}
