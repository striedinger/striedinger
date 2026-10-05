export type SvgTokenKind =
  | "attribute"
  | "comment"
  | "meta"
  | "punctuation"
  | "tag"
  | "text"
  | "value";

export interface SvgToken {
  kind: SvgTokenKind;
  /** Where the token begins in the source, which also identifies it. */
  start: number;
  text: string;
}

const tagPattern = /^(<\/?)([^\s/>]*)/;
const insideTagPattern = /^(?:(\s+)|(\/?>)|(=)|("[^"]*"?|'[^']*'?)|([^\s=/>"']+)|([\s\S]))/;

/**
 * Splits SVG markup into tokens for syntax coloring. The tokens always join back into the
 * exact source, even while it is half typed, so the colored text lines up with the editor.
 */
export function tokenizeSvg(source: string): SvgToken[] {
  const tokens: SvgToken[] = [];
  let index = 0;

  function push(kind: SvgTokenKind, text: string) {
    if (!text) return;
    const previous = tokens.at(-1);
    if (previous?.kind === kind) previous.text += text;
    else tokens.push({ kind, start: index, text });
    index += text.length;
  }

  while (index < source.length) {
    const rest = source.slice(index);
    if (!rest.startsWith("<")) {
      const nextTag = rest.indexOf("<");
      push("text", nextTag === -1 ? rest : rest.slice(0, nextTag));
      continue;
    }
    if (rest.startsWith("<!--")) {
      const end = rest.indexOf("-->");
      push("comment", end === -1 ? rest : rest.slice(0, end + 3));
      continue;
    }
    if (rest.startsWith("<?") || rest.startsWith("<!")) {
      const end = rest.indexOf(">");
      push("meta", end === -1 ? rest : rest.slice(0, end + 1));
      continue;
    }
    const [, opening = "<", name = ""] = tagPattern.exec(rest) ?? [];
    push("punctuation", opening);
    push("tag", name);
    index = tokenizeInsideTag(source, index, push);
  }
  return tokens;
}

function tokenizeInsideTag(
  source: string,
  start: number,
  push: (kind: SvgTokenKind, text: string) => void,
) {
  let index = start;
  while (index < source.length) {
    const match = insideTagPattern.exec(source.slice(index));
    if (!match) break;
    const [text, whitespace, closing, equals, value, attribute] = match;
    index += text.length;
    if (whitespace) push("text", text);
    else if (closing) {
      push("punctuation", text);
      return index;
    } else if (equals) push("punctuation", text);
    else if (value) push("value", text);
    else if (attribute) push("attribute", text);
    else {
      // A stray `<` starts the next tag instead of belonging to this one.
      if (text === "<") return index - 1;
      push("text", text);
    }
  }
  return index;
}
