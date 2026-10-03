import type { IconProps } from "./icon-props";

export function SquareStackFillIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <rect x="3" y="8.5" width="18" height="12.5" rx="2.2" />
      <rect x="5" y="5.2" width="14" height="1.9" rx=".95" />
      <rect x="7.2" y="2.4" width="9.6" height="1.6" rx=".8" />
    </svg>
  );
}
