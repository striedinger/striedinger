import type { IconProps } from "./icon-props";

export function EmailIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path d="M2.25 5.25A2.25 2.25 0 0 1 4.5 3h15a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 19.5 21h-15a2.25 2.25 0 0 1-2.25-2.25V5.25Zm2.2-.75 7.55 6.04 7.55-6.04H4.45Zm15.8 1.56-7.31 5.85a1.5 1.5 0 0 1-1.88 0L3.75 6.06v12.69c0 .41.34.75.75.75h15c.41 0 .75-.34.75-.75V6.06Z" />
    </svg>
  );
}
