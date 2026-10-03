import type { IconProps } from "./icon-props";

export function SpeakerWaveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M2.5 9.6c0-.6.5-1.1 1.1-1.1h2.6l4.2-3.7a.8.8 0 0 1 1.3.6v13.2a.8.8 0 0 1-1.3.6l-4.2-3.7H3.6c-.6 0-1.1-.5-1.1-1.1Z" />
      <path
        d="M15 8.8a4.5 4.5 0 0 1 0 6.4M18 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
