import type { IconProps } from "./icon-props";

export function BubbleIcon(props: IconProps) {
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
      <path d="M12 4.5c4.7 0 8.5 3 8.5 6.8S16.7 18 12 18c-.9 0-1.8-.1-2.6-.3L5 19.5l1.3-3.4c-1.7-1.2-2.8-3-2.8-4.8 0-3.7 3.8-6.8 8.5-6.8Z" />
    </svg>
  );
}
