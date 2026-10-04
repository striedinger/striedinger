import { createCn } from "cnfast";

/**
 * Apple's text styles, defined as Tailwind font sizes (`text-ios-body` and so on) by the
 * native apps' stylesheet. Registering them as font sizes lets `cn` replace a component's
 * default size with them instead of mistaking them for text colors.
 */
const iosTextStyles = new Set([
  "ios-large-title",
  "ios-title1",
  "ios-title2",
  "ios-title3",
  "ios-body",
  "ios-callout",
  "ios-subheadline",
  "ios-footnote",
  "ios-caption1",
  "ios-caption2",
]);

function isIosTextStyle(value: string) {
  return iosTextStyles.has(value);
}

export const cn = createCn({ extend: { theme: { text: [isIosTextStyle] } } });
