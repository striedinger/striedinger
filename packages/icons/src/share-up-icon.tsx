import type { IconProps } from "./icon-props";

export function ShareUpIcon(props: IconProps) {
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
      <path d="M8.5 9.5H7a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.5a2 2 0 0 0-2-2h-1.5" />
      <path d="M12 14.5V2.8M8.3 6.3 12 2.6l3.7 3.7" />
    </svg>
  );
}
