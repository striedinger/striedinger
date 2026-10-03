const blockTags = new Set(["P", "H1", "H2", "H3", "PRE", "BLOCKQUOTE", "UL", "OL", "LI"]);
const inlineTags = new Set(["B", "I", "U", "S", "BR", "A", "IMG"]);
const renamedTags: Readonly<Record<string, string>> = {
  DEL: "S",
  DIV: "P",
  EM: "I",
  H4: "H3",
  H5: "H3",
  H6: "H3",
  STRIKE: "S",
  STRONG: "B",
};
const droppedTags = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "TEMPLATE",
  "NOSCRIPT",
  "SVG",
  "MATH",
  "FORM",
  "INPUT",
  "BUTTON",
  "SELECT",
  "TEXTAREA",
  "META",
  "LINK",
  "HEAD",
  "TITLE",
]);
const safeImageSource = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;
const whitespacePattern = /\s+/g;

export const emptyNoteHtml = "<h1><br></h1>";

export function isSafeNoteImageSource(source: string) {
  return safeImageSource.test(source);
}

/**
 * Rebuilds note markup from an allowlist so pasted or stored HTML can only contain the
 * formatting Notes supports: text styles, lists, checklists, quotes, links, and images.
 */
export function sanitizeNoteHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const output = document.createElement("div");
  appendSanitizedChildren(template.content, output);
  return output.innerHTML;
}

function appendSanitizedChildren(source: ParentNode, target: Element) {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.append(child.textContent ?? "");
      continue;
    }
    if (!(child instanceof Element)) continue;
    const tagName = renamedTags[child.tagName] ?? child.tagName;
    if (droppedTags.has(tagName)) continue;
    if (!blockTags.has(tagName) && !inlineTags.has(tagName)) {
      appendSanitizedChildren(child, target);
      continue;
    }
    const element = createSanitizedElement(child, tagName);
    if (!element) continue;
    if (tagName !== "BR" && tagName !== "IMG") appendSanitizedChildren(child, element);
    target.append(element);
  }
}

function createSanitizedElement(source: Element, tagName: string): Element | null {
  if (tagName === "IMG") {
    const imageSource = source.getAttribute("src") ?? "";
    if (!isSafeNoteImageSource(imageSource)) return null;
    const image = document.createElement("img");
    image.setAttribute("src", imageSource);
    image.setAttribute("alt", source.getAttribute("alt")?.slice(0, 200) ?? "");
    return image;
  }
  const element = document.createElement(tagName.toLowerCase());
  if (tagName === "A") {
    const href = source.getAttribute("href") ?? "";
    if (!/^(?:https?:|mailto:)/i.test(href)) return document.createElement("span");
    element.setAttribute("href", href);
    element.setAttribute("rel", "noopener noreferrer");
    element.setAttribute("target", "_blank");
  }
  if (tagName === "UL") {
    const listType = source.getAttribute("data-type");
    if (listType === "checklist" || listType === "dashed")
      element.setAttribute("data-type", listType);
  }
  if (tagName === "LI" && source.closest("ul[data-type='checklist']")) {
    element.setAttribute(
      "data-checked",
      source.getAttribute("data-checked") === "true" ? "true" : "false",
    );
  }
  return element;
}

export interface NoteSummary {
  preview: string;
  thumbnail: string | null;
  title: string;
}

/** Derives the list title, preview line, and thumbnail the way Notes does: from the first lines. */
export function summarizeNoteHtml(html: string): NoteSummary {
  const template = document.createElement("template");
  template.innerHTML = html;
  const lines = collectTextLines(template.content);
  const thumbnail = template.content.querySelector("img")?.getAttribute("src") ?? null;
  return {
    title: (lines[0] ?? "").slice(0, 200),
    preview: lines.slice(1).join(" ").slice(0, 240),
    thumbnail,
  };
}

/** Plain text used for sharing and search, one line per block. */
export function noteHtmlToPlainText(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  return collectTextLines(template.content, true).join("\n");
}

function collectTextLines(root: ParentNode, markChecklists = false): string[] {
  const lines: string[] = [];
  let currentLine = "";

  function flush() {
    const normalizedLine = currentLine.replace(whitespacePattern, " ").trim();
    if (normalizedLine) lines.push(normalizedLine);
    currentLine = "";
  }

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent ?? "";
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "BR") {
      flush();
      return;
    }
    const isBlock = blockTags.has(node.tagName) || node.tagName === "DIV";
    if (isBlock) flush();
    if (markChecklists && node.tagName === "LI") {
      const checked = node.getAttribute("data-checked");
      if (checked !== null) currentLine += checked === "true" ? "☑ " : "☐ ";
      else currentLine += node.parentElement?.tagName === "OL" ? `${listIndex(node)}. ` : "• ";
    }
    for (const child of Array.from(node.childNodes)) visit(child);
    if (isBlock) flush();
  }

  for (const child of Array.from(root.childNodes)) visit(child);
  flush();
  return lines;
}

function listIndex(item: Element) {
  return Array.from(item.parentElement?.children ?? []).indexOf(item) + 1;
}
