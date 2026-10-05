import { memo } from "react";

import type { SvgTokenKind } from "./tokenize-svg";

interface SvgCodeLineProps {
  /** The line's tokens as `kind\u0001text` pairs joined by `\u0002`, so equal lines compare equal. */
  encodedTokens: string;
}

const tokenClassNames: Readonly<Record<SvgTokenKind, string>> = {
  attribute: "text-ios-orange",
  comment: "text-ios-green",
  meta: "text-ios-secondary-label",
  punctuation: "text-ios-secondary-label",
  tag: "text-ios-purple",
  text: "text-ios-label",
  value: "text-ios-red",
};

/**
 * One syntax-colored line. Memoized on its encoded tokens, so a keystroke re-renders only the
 * line it changed instead of every token in the file.
 */
export const SvgCodeLine = memo(function SvgCodeLine({ encodedTokens }: SvgCodeLineProps) {
  if (!encodedTokens) return null;
  return encodedTokens.split("\u0002").map(function renderToken(pair, index) {
    const separator = pair.indexOf("\u0001");
    const kind = pair.slice(0, separator) as SvgTokenKind;
    return (
      // Tokens never reorder within a line, so their position identifies them.
      // oxlint-disable-next-line react/no-array-index-key
      <span key={index} className={tokenClassNames[kind]}>
        {pair.slice(separator + 1)}
      </span>
    );
  });
});
