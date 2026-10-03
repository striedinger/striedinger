import type { IconProps } from "./icon-props";

export function CameraIcon(props: IconProps) {
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
      <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h1.9l1.5-2.2h5.2L16.1 6H18a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5Z" />
      <circle cx="12" cy="12.8" r="3.6" />
    </svg>
  );
}
