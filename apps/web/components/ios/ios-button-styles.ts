// The iOS filled button: a capsule in the app tint for a screen's primary action. Works on
// buttons, links, and the labels that open file pickers, so focus shows either way.
export const iosFilledButtonClassName =
  "flex h-12.5 items-center justify-center gap-2 rounded-full bg-ios-tint px-6 text-ios-body font-semibold text-white shadow-ios-button outline-none select-none transition-[transform,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ios-tint/50 focus-within:ring-2 focus-within:ring-ios-tint/50 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none [&_svg]:size-5";

// A small tinted capsule for secondary actions beside content, such as suggestions in a card.
export const iosChipButtonClassName =
  "flex h-8 items-center rounded-full bg-ios-fill px-3.5 text-ios-subheadline font-semibold text-ios-tint outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 disabled:text-ios-tertiary-label disabled:active:opacity-100";
