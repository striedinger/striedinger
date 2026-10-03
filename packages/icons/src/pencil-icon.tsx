import type { IconProps } from "./icon-props";

export function PencilIcon(props: IconProps) {
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
      <path d="M16.3 3.7a2.2 2.2 0 0 1 3.1 3.1L8 18.2l-4.2 1 1-4.2Z" />
    </svg>
  );
}
