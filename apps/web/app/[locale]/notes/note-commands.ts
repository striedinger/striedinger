// Formatting commands for the contenteditable note body. They use the browser's editing
// commands so each change joins the native undo stack, then normalize the markup Notes needs.

export type NoteBlockStyle = "h1" | "h2" | "h3" | "p" | "pre";
export type NoteInlineStyle = "bold" | "italic" | "underline" | "strikeThrough";
export type NoteListStyle = "bulleted" | "dashed" | "numbered";

export interface NoteFormatState {
  blockStyle: NoteBlockStyle | null;
  blockQuote: boolean;
  bold: boolean;
  checklist: boolean;
  inList: boolean;
  italic: boolean;
  listStyle: NoteListStyle | null;
  strikeThrough: boolean;
  underline: boolean;
}

export const emptyFormatState: NoteFormatState = {
  blockStyle: null,
  blockQuote: false,
  bold: false,
  checklist: false,
  inList: false,
  italic: false,
  listStyle: null,
  strikeThrough: false,
  underline: false,
};

function runCommand(command: string, value?: string) {
  // execCommand is deprecated but remains the only API that edits contenteditable content
  // while preserving the browser's native undo and redo history.
  if (typeof document.execCommand !== "function") return false;
  return document.execCommand(command, false, value);
}

function queryCommandState(command: string) {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

export function prepareEditingCommands() {
  runCommand("defaultParagraphSeparator", "p");
  runCommand("styleWithCSS", "false");
}

function getSelectionElement(editor: HTMLElement): Element | null {
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;
  return anchor instanceof Element ? anchor : anchor.parentElement;
}

function closestWithin(element: Element | null, selector: string, editor: HTMLElement) {
  const match = element?.closest(selector);
  return match && editor.contains(match) && match !== editor ? match : null;
}

export function readFormatState(editor: HTMLElement): NoteFormatState {
  const element = getSelectionElement(editor);
  if (!element) return emptyFormatState;
  const block = closestWithin(element, "h1, h2, h3, pre, p", editor);
  const list = closestWithin(element, "ul, ol", editor);
  const listType = list?.getAttribute("data-type");
  return {
    blockStyle: block ? (block.tagName.toLowerCase() as NoteBlockStyle) : list ? null : "p",
    blockQuote: Boolean(closestWithin(element, "blockquote", editor)),
    bold: queryCommandState("bold"),
    checklist: listType === "checklist",
    inList: Boolean(list),
    italic: queryCommandState("italic"),
    listStyle: !list
      ? null
      : list.tagName === "OL"
        ? "numbered"
        : listType === "dashed"
          ? "dashed"
          : listType === "checklist"
            ? null
            : "bulleted",
    strikeThrough: queryCommandState("strikeThrough"),
    underline: queryCommandState("underline"),
  };
}

export function applyBlockStyle(editor: HTMLElement, blockStyle: NoteBlockStyle) {
  const list = closestWithin(getSelectionElement(editor), "ul, ol", editor);
  if (list) runCommand(list.tagName === "OL" ? "insertOrderedList" : "insertUnorderedList");
  runCommand("formatBlock", `<${blockStyle}>`);
}

export function toggleInlineStyle(inlineStyle: NoteInlineStyle) {
  runCommand(inlineStyle);
}

export function toggleBlockQuote(editor: HTMLElement) {
  const isQuoted = Boolean(closestWithin(getSelectionElement(editor), "blockquote", editor));
  runCommand("formatBlock", isQuoted ? "<p>" : "<blockquote>");
}

function getCurrentList(editor: HTMLElement) {
  return closestWithin(getSelectionElement(editor), "ul, ol", editor);
}

function markCurrentList(editor: HTMLElement, listType: "checklist" | "dashed" | null) {
  const list = getCurrentList(editor);
  if (!list || list.tagName !== "UL") return;
  if (listType) list.setAttribute("data-type", listType);
  else list.removeAttribute("data-type");
  for (const item of Array.from(list.children)) {
    if (listType === "checklist") {
      if (!item.hasAttribute("data-checked")) item.setAttribute("data-checked", "false");
    } else {
      item.removeAttribute("data-checked");
    }
  }
}

export function toggleList(editor: HTMLElement, listStyle: NoteListStyle) {
  const list = getCurrentList(editor);
  const currentStyle = list
    ? list.tagName === "OL"
      ? "numbered"
      : list.getAttribute("data-type") === "dashed"
        ? "dashed"
        : list.getAttribute("data-type") === "checklist"
          ? "checklist"
          : "bulleted"
    : null;

  if (currentStyle === listStyle) {
    runCommand(listStyle === "numbered" ? "insertOrderedList" : "insertUnorderedList");
    return;
  }
  const needsOrderedList = listStyle === "numbered";
  const hasOrderedList = currentStyle === "numbered";
  if (!list || needsOrderedList !== hasOrderedList) {
    if (list) runCommand(hasOrderedList ? "insertOrderedList" : "insertUnorderedList");
    clearHeadingForList(editor);
    runCommand(needsOrderedList ? "insertOrderedList" : "insertUnorderedList");
  }
  if (!needsOrderedList) markCurrentList(editor, listStyle === "dashed" ? "dashed" : null);
}

export function toggleChecklist(editor: HTMLElement) {
  const list = getCurrentList(editor);
  if (list?.getAttribute("data-type") === "checklist") {
    runCommand("insertUnorderedList");
    return;
  }
  if (list?.tagName === "OL") runCommand("insertOrderedList");
  if (!list || list.tagName === "OL") {
    clearHeadingForList(editor);
    runCommand("insertUnorderedList");
  }
  markCurrentList(editor, "checklist");
}

function clearHeadingForList(editor: HTMLElement) {
  const heading = closestWithin(getSelectionElement(editor), "h1, h2, h3, pre", editor);
  if (heading) runCommand("formatBlock", "<p>");
}

export function changeIndent(editor: HTMLElement, direction: "increase" | "decrease") {
  if (!getCurrentList(editor)) return;
  runCommand(direction === "increase" ? "indent" : "outdent");
  const list = getCurrentList(editor);
  const parentList = list?.parentElement?.closest("ul, ol");
  if (list && parentList && list.tagName === "UL" && parentList.tagName === "UL") {
    const parentType = parentList.getAttribute("data-type");
    markCurrentList(
      editor,
      parentType === "checklist" || parentType === "dashed" ? parentType : null,
    );
  }
}

/** New checklist items created with Return start unchecked, as they do in Notes. */
export function normalizeChecklistItem(editor: HTMLElement) {
  const item = closestWithin(getSelectionElement(editor), "li", editor);
  if (item?.parentElement?.getAttribute("data-type") === "checklist") {
    item.setAttribute("data-checked", "false");
  }
}

export function insertImage(source: string) {
  runCommand("insertHTML", `<img src="${source}" alt=""><p><br></p>`);
}

export function insertSanitizedHtml(html: string) {
  runCommand("insertHTML", html);
}

export function insertPlainText(text: string) {
  runCommand("insertText", text);
}

/** An emptied note starts again with a Title line, as it does in Notes. */
export function ensureTitleLine(editor: HTMLElement) {
  if (editor.textContent || editor.querySelector("img, li")) return;
  if (editor.firstElementChild?.tagName === "H1") return;
  runCommand("formatBlock", "<h1>");
}

export function undoEditing() {
  runCommand("undo");
}

export function placeCaretAtEnd(editor: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function startNewLineAtEnd(editor: HTMLElement) {
  const lastBlock = editor.lastElementChild;
  const lastBlockIsEmpty =
    lastBlock && !lastBlock.textContent?.trim() && !lastBlock.querySelector("img");
  if (!lastBlockIsEmpty || lastBlock.tagName !== "P") {
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    editor.append(paragraph);
  }
  placeCaretAtEnd(editor);
}
