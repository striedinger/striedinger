import type { IconProps } from "./icon-props";

export function PodcastIcon(props: IconProps) {
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
      <circle cx="12" cy="10.5" r="2.2" />
      <path d="M8.5 14.3a5 5 0 1 1 7 0M5.7 17.2a9 9 0 1 1 12.6 0M12 14v7" />
    </svg>
  );
}
