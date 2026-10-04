// The iOS filled button: a capsule in the app tint for a screen's primary action. Works on
// buttons, links, and the labels that open file pickers, so focus shows either way.
export const iosFilledButtonClassName =
  "flex h-[50px] items-center justify-center gap-2 rounded-full bg-ios-tint px-6 text-ios-body font-semibold text-white shadow-ios-button outline-none select-none transition-[transform,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ios-tint/50 focus-within:ring-2 focus-within:ring-ios-tint/50 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none [&_svg]:size-5";
