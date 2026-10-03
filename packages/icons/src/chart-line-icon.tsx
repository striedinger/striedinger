import type { IconProps } from "./icon-props";

export function ChartLineIcon(props: IconProps) {
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
      <path d="M3.5 17.5 9 11l4 4 7.5-9" />
      <path d="M15.5 6h5v5" />
    </svg>
  );
}
