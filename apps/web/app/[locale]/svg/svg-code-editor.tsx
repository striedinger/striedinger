"use client";

import type { ChangeEvent } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { maximumSvgCharacters } from "./inspect-svg";
import { SvgCodeLine } from "./svg-code-line";
import { encodeSvgTokenLines, tokenizeSvg } from "./tokenize-svg";

interface SvgCodeEditorProps {
  invalid: boolean;
  label: string;
  onChange: (source: string) => void;
  placeholder: string;
  /** Locks the text while a slow change, such as optimizing, is being made. */
  readOnly?: boolean;
  value: string;
}

/** Coloring every keystroke stays instant up to this size; larger files show plain text. */
const maximumHighlightedCharacters = 60_000;

const codeClassName =
  "col-start-1 row-start-1 m-0 min-h-full px-4 py-3.5 font-mono text-[14px] leading-[22px] wrap-anywhere whitespace-pre-wrap";

/**
 * A plain textarea layered over a syntax-colored copy of its text, like the code views in
 * Swift Playgrounds. Both share one grid cell sized by the colored copy, so the card scrolls
 * them together and the caret always sits on the colored letters. Very large files skip the
 * coloring, and the hidden copy only sizes the cell.
 */
export function SvgCodeEditor({
  invalid,
  label,
  onChange,
  placeholder,
  readOnly = false,
  value,
}: SvgCodeEditorProps) {
  const isHighlighted = value.length <= maximumHighlightedCharacters;

  return (
    <div className="h-80 overflow-y-auto overscroll-contain rounded-ios-xl bg-ios-grouped-cell transition-shadow duration-150 focus-within:ring-2 focus-within:ring-ios-tint/35 motion-reduce:transition-none lg:h-full">
      <div className="grid min-h-full">
        <pre
          aria-hidden="true"
          className={cn(codeClassName, "pointer-events-none", !isHighlighted && "invisible")}
        >
          {isHighlighted
            ? encodeSvgTokenLines(tokenizeSvg(value)).map(function renderLine(line, index) {
                return (
                  // oxlint-disable-next-line react/no-array-index-key -- Lines are positional; unchanged ones skip rendering.
                  <span key={index}>
                    {index > 0 ? "\n" : null}
                    <SvgCodeLine encodedTokens={line} />
                  </span>
                );
              })
            : value}
          {/* A final newline still needs a line of height. */}
          {"\n"}
        </pre>
        <textarea
          className={cn(
            codeClassName,
            "size-full resize-none overflow-hidden bg-transparent caret-ios-tint outline-none selection:bg-ios-tint/25 placeholder:text-ios-tertiary-label",
            isHighlighted ? "text-transparent" : "text-ios-label",
          )}
          value={value}
          onChange={function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
            onChange(event.currentTarget.value);
          }}
          placeholder={placeholder}
          readOnly={readOnly}
          aria-label={label}
          aria-invalid={invalid}
          maxLength={maximumSvgCharacters}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
