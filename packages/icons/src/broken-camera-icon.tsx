import type { IconProps } from "./icon-props";

export function BrokenCameraIcon(props: IconProps) {
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
      <path d="m2 2 20 20" />
      <path d="M6.5 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12.5" />
      <path d="M9 4h6l2 2h2a3 3 0 0 1 3 3v7" />
      <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
    </svg>
  );
}
