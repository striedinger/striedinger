import type { IconProps } from "./icon-props";

export function SquareGridFillIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  );
}
