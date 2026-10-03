import { useId } from "react";

import type { IconProps } from "./icon-props";

export function CircleXFillIcon(props: IconProps) {
  const maskId = useId();

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <path
          d="m8.5 8.5 7 7m0-7-7 7"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </mask>
      <circle cx="12" cy="12" r="10" mask={`url(#${maskId})`} />
    </svg>
  );
}
