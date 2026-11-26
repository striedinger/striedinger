import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseSync } from "oxc-parser";

export type Language = "script" | "rust" | "swift" | "css" | "hash";

export interface Comment {
  start: number;
  end: number;
  text: string;
}

const scriptExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const hashExtensions = new Set([".py", ".sh", ".bash", ".yml", ".yaml", ".toml"]);
const hashFileNames = new Set([".gitignore", ".env.example", "Dockerfile"]);
const excludedPrefixes = [".agents/", "apps/web/licenses/", "apps/web/public/vendor/"];
const generatedFileNames = new Set(["next-env.d.ts"]);

export function languageOf(path: string): Language | null {
  if (
    excludedPrefixes.some(function isExcluded(prefix) {
      return path.startsWith(prefix);
    })
  ) {
    return null;
  }
  const name = basename(path);
  if (generatedFileNames.has(name)) return null;
  const extension = extname(path);
  if (scriptExtensions.has(extension)) return "script";
  if (extension === ".rs") return "rust";
  if (extension === ".swift") return "swift";
  if (extension === ".css") return "css";
  if (hashExtensions.has(extension) || hashFileNames.has(name)) return "hash";
  return null;
}

function scriptComments(path: string, source: string): Comment[] {
  const { comments } = parseSync(basename(path), source);
  return comments.map(function toComment(comment) {
    return {
      start: comment.start,
      end: comment.end,
      text: source.slice(comment.start, comment.end),
    };
  });
}

function skipQuoted(source: string, index: number, quote: string): number {
  let position = index + 1;
  while (position < source.length && source[position] !== quote) {
    position += source[position] === "\\" ? 2 : 1;
  }
  return position + 1;
}

function skipNestedBlock(source: string, index: number): number {
  let depth = 0;
  let position = index;
  while (position < source.length) {
    if (source.startsWith("/*", position)) {
      depth += 1;
      position += 2;
    } else if (source.startsWith("*/", position)) {
      depth -= 1;
      position += 2;
      if (depth === 0) return position;
    } else {
      position += 1;
    }
  }
  return position;
}

function lineEnd(source: string, index: number): number {
  const end = source.indexOf("\n", index);
  return end === -1 ? source.length : end;
}

const rawStringStart = /^(?:br|r|cr)#*"/;

function rustComments(source: string): Comment[] {
  const comments: Comment[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    const previous = index > 0 ? source[index - 1] : "";
    const isIdentifierBoundary = !/\w/.test(previous);
    if (source.startsWith("//", index)) {
      const end = lineEnd(source, index);
      comments.push({ start: index, end, text: source.slice(index, end) });
      index = end;
    } else if (source.startsWith("/*", index)) {
      const end = skipNestedBlock(source, index);
      comments.push({ start: index, end, text: source.slice(index, end) });
      index = end;
    } else if (isIdentifierBoundary && rawStringStart.test(source.slice(index, index + 260))) {
      const opening = rawStringStart.exec(source.slice(index, index + 260))?.[0] ?? "";
      const closing = `"${opening.replace(/^[a-z]+|"$/g, "")}`;
      const end = source.indexOf(closing, index + opening.length);
      index = end === -1 ? source.length : end + closing.length;
    } else if (character === '"') {
      index = skipQuoted(source, index, '"');
    } else if (character === "'") {
      if (source[index + 1] === "\\") {
        index = skipQuoted(source, index, "'");
      } else {
        const codePoint = source.codePointAt(index + 1) ?? 0;
        const width = codePoint > 0xffff ? 2 : 1;
        index += source[index + 1 + width] === "'" ? width + 2 : 1;
      }
    } else {
      index += 1;
    }
  }
  return comments;
}

function swiftComments(source: string): Comment[] {
  const comments: Comment[] = [];
  function skipString(start: number): number {
    const hashes = /^#*/.exec(source.slice(start))?.[0] ?? "";
    let position = start + hashes.length;
    const isMultiline = source.startsWith('"""', position);
    const delimiter = (isMultiline ? '"""' : '"') + hashes;
    position += isMultiline ? 3 : 1;
    const escape = `\\${hashes}`;
    while (position < source.length) {
      if (source.startsWith(`${escape}(`, position)) {
        position = skipCode(position + escape.length + 1, ")");
      } else if (source.startsWith(escape, position)) {
        position += escape.length + 1;
      } else if (source.startsWith(delimiter, position)) {
        return position + delimiter.length;
      } else {
        position += 1;
      }
    }
    return position;
  }
  function skipCode(start: number, closing: string): number {
    let position = start;
    let depth = 0;
    while (position < source.length) {
      const character = source[position];
      if (source.startsWith("//", position)) {
        const end = lineEnd(source, position);
        comments.push({ start: position, end, text: source.slice(position, end) });
        position = end;
      } else if (source.startsWith("/*", position)) {
        const end = skipNestedBlock(source, position);
        comments.push({ start: position, end, text: source.slice(position, end) });
        position = end;
      } else if (character === '"' || /^#+"/.test(source.slice(position, position + 8))) {
        position = skipString(position);
      } else if (character === "(") {
        depth += 1;
        position += 1;
      } else if (character === closing && depth === 0) {
        return position + 1;
      } else {
        if (character === ")") depth -= 1;
        position += 1;
      }
    }
    return position;
  }
  skipCode(0, "\0");
  return comments;
}

function cssComments(source: string): Comment[] {
  const comments: Comment[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index + 2);
      const end = close === -1 ? source.length : close + 2;
      comments.push({ start: index, end, text: source.slice(index, end) });
      index = end;
    } else if (character === '"' || character === "'") {
      index = skipQuoted(source, index, character);
    } else {
      index += 1;
    }
  }
  return comments;
}

function hashComments(source: string): Comment[] {
  const comments: Comment[] = [];
  let lineStart = 0;
  let heredocTerminator: string | null = null;
  while (lineStart < source.length) {
    const end = lineEnd(source, lineStart);
    const line = source.slice(lineStart, end);
    if (heredocTerminator !== null) {
      if (line.trim() === heredocTerminator) heredocTerminator = null;
    } else {
      let quote: string | null = null;
      for (let column = 0; column < line.length; column += 1) {
        const character = line[column];
        const previous = column > 0 ? line[column - 1] : " ";
        if (quote !== null) {
          if (character === "\\" && quote === '"') column += 1;
          else if (character === quote) quote = null;
        } else if (character === "#" && /\s/.test(previous ?? " ")) {
          comments.push({
            start: lineStart + column,
            end,
            text: line.slice(column),
          });
          break;
        } else if ((character === '"' || character === "'") && /[\s=:([,{]/.test(previous ?? " ")) {
          quote = character;
        }
      }
      const heredoc = /<<-?\s*['"]?(\w+)['"]?/.exec(line);
      if (heredoc?.[1] !== undefined) heredocTerminator = heredoc[1];
    }
    lineStart = end + 1;
  }
  return comments;
}

export function findComments(path: string, language: Language, source: string): Comment[] {
  switch (language) {
    case "script":
      return scriptComments(path, source);
    case "rust":
      return rustComments(source);
    case "swift":
      return swiftComments(source);
    case "css":
      return cssComments(source);
    case "hash":
      return hashComments(source);
  }
}

const noticePattern =
  /SPDX-License-Identifier|@license|Copyright (?:\(c\)|©|\d{4})|Licensed under/i;
const scriptDirectivePattern =
  /^(?:\/\/|\/\*)\s*(?:oxlint-(?:disable|enable)|eslint-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck|check)|@vitest-environment|@jsxImportSource|prettier-ignore|oxfmt-ignore|webpackIgnore|turbopackIgnore|@vite-ignore|[#@]__PURE__)/;
const hashDirectivePattern =
  /^#\s*(?:shellcheck\s|noqa|type:|pragma|yaml-language-server:|syntax=)|^#:schema/;
const actionPinPattern = /uses:\s*\S+@[\da-f]{40}\s*$/;
const versionTagPattern = /^#\s*v?\d+(?:\.\d+)*\s*$/;

export function isAllowed(language: Language, comment: Comment, source: string): boolean {
  const { text } = comment;
  if (noticePattern.test(text)) return true;
  switch (language) {
    case "script":
      return (
        text.startsWith("/**") ||
        text.startsWith("/// <reference") ||
        scriptDirectivePattern.test(text)
      );
    case "rust":
      return (
        (/^\/\/[/!]/.test(text) && !text.startsWith("////")) ||
        (/^\/\*[*!]/.test(text) && !text.startsWith("/***")) ||
        /^\/\/\s*SAFETY:/.test(text)
      );
    case "swift":
      return (
        (text.startsWith("///") && !text.startsWith("////")) ||
        text.startsWith("/**") ||
        /^\/\/\s*(?:swift-tools-version|swiftlint:)/.test(text)
      );
    case "css":
      return text.startsWith("/*!") || /^\/\*\s*(?:prettier-ignore|oxfmt-ignore)/.test(text);
    case "hash": {
      if (comment.start === 0 && text.startsWith("#!")) return true;
      if (hashDirectivePattern.test(text)) return true;
      const lineStart = source.lastIndexOf("\n", comment.start - 1) + 1;
      const code = source.slice(lineStart, comment.start);
      return actionPinPattern.test(code) && versionTagPattern.test(text);
    }
  }
}

function lineStartOf(source: string, index: number): number {
  return source.lastIndexOf("\n", index - 1) + 1;
}

function removeOne(source: string, comment: Comment): string {
  let { start, end } = comment;
  const lineStart = lineStartOf(source, start);
  let currentLineEnd = lineEnd(source, end);
  let before = source.slice(lineStart, start);
  let after = source.slice(end, currentLineEnd);
  const jsxOpen = /\{\s*$/.exec(before);
  const jsxClose = /^\s*\}/.exec(after);
  if (jsxOpen && jsxClose) {
    start -= jsxOpen[0].length;
    end += jsxClose[0].length;
    before = source.slice(lineStart, start);
    after = source.slice(end, currentLineEnd);
  }
  if (before.trim() === "" && after.trim() === "") {
    currentLineEnd = Math.min(currentLineEnd + 1, source.length);
    let removedStart = lineStart;
    const previousBlank = lineStart >= 2 && source[lineStart - 2] === "\n";
    const nextBlank = source[currentLineEnd] === "\n";
    if ((previousBlank || lineStart === 0) && nextBlank) currentLineEnd += 1;
    else if (previousBlank && currentLineEnd >= source.length) removedStart -= 1;
    return source.slice(0, removedStart) + source.slice(currentLineEnd);
  }
  if (after.trim() === "") {
    return source.slice(0, lineStart) + before.trimEnd() + source.slice(currentLineEnd);
  }
  const joined = before.endsWith(" ") && after.startsWith(" ") ? end + 1 : end;
  return source.slice(0, start) + source.slice(joined);
}

export function removeComments(source: string, comments: Comment[]): string {
  return [...comments]
    .toSorted(function lastFirst(left, right) {
      return right.start - left.start;
    })
    .reduce(removeOne, source);
}

export function disallowedComments(path: string, source: string): Comment[] {
  const language = languageOf(path);
  if (language === null) return [];
  return findComments(path, language, source).filter(function isDisallowed(comment) {
    return !isAllowed(language, comment, source);
  });
}

function trackedFiles(): string[] {
  const result = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout.split("\0").filter(Boolean);
}

function main() {
  const fix = process.argv.includes("--fix");
  let violations = 0;
  for (const path of trackedFiles()) {
    if (languageOf(path) === null) continue;
    let source: string;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const comments = disallowedComments(path, source);
    if (comments.length === 0) continue;
    if (fix) {
      writeFileSync(path, removeComments(source, comments));
      continue;
    }
    for (const comment of comments) {
      const line = source.slice(0, comment.start).split("\n").length;
      const preview = comment.text.split("\n")[0]?.slice(0, 80) ?? "";
      process.stderr.write(`${path}:${line}: ${preview}\n`);
      violations += 1;
    }
  }
  if (violations > 0) {
    process.stderr.write(
      `\n${violations} comments are not allowed. Comments are limited to doc comments, tool directives, license notices, \`// SAFETY:\` notes, and action version tags. Run \`pnpm comments:fix\` to remove them.\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) main();
