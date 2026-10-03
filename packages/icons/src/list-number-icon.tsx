import type { IconProps } from "./icon-props";

export function ListNumberIcon(props: IconProps) {
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
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path
        strokeWidth="1.5"
        d="m3.6 4.6 1.4-.9v4.6M3.6 10.6a1.3 1.3 0 1 1 2.1 1.1l-2.1 2.1h2.6M3.6 16.1a1.2 1.2 0 1 1 1.3 1.3 1.2 1.2 0 1 1-1.3 1.3"
      />
    </svg>
  );
}
