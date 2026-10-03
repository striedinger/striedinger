import type { IconProps } from "./icon-props";

/** The current-location arrow, like SF Symbols' location.fill. */
export function LocationArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M20.3 3.7a.9.9 0 0 1 .2 1L13.4 20.6a.9.9 0 0 1-1.7-.1l-1.6-6.6-6.6-1.6a.9.9 0 0 1-.1-1.7L19.3 3.5a.9.9 0 0 1 1 .2Z" />
    </svg>
  );
}
