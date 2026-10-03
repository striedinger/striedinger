// The iOS 26 scroll-edge effect under a bottom bar: content scrolling beneath, including into
// the home-indicator safe area, softens into a light blur and tint instead of meeting an
// opaque strip. Set `--ios-bar-edge` on the scroll container to match its background.
export const iosBottomScrollEdgeClassName =
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-linear-to-t before:from-[color-mix(in_srgb,var(--ios-bar-edge,var(--ios-background))_45%,transparent)] before:to-transparent before:backdrop-blur-[5px] before:[mask-image:linear-gradient(to_top,black_35%,transparent)]";
