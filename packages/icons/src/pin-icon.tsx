import type { IconProps } from "./icon-props";

export function PinIcon(props: IconProps) {
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
      <path d="M9 3.5h6l-.8 5.6 3.3 3.2v1.9h-11v-1.9l3.3-3.2Z" />
      <path d="M12 14.2v6.3" />
    </svg>
  );
}
