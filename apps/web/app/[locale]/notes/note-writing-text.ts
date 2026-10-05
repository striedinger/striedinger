// Reads note text for Writing Tools and writes results back through the browser's editing
// commands, so every change joins the native undo history and the note saves as usual.

interface TextSegment {
  node: Text;
  /** The used text when it was read, to detect edits made since. */
  text: string;
  /** Where the node's used text starts in the combined text. */
  textStart: number;
  /** The used part of the node, which a selection can clip. */
  nodeStart: number;
  nodeEnd: number;
}

export interface NoteTextSnapshot {
  segments: TextSegment[];
  text: string;
}

const blockSelector = "p, h1, h2, h3, pre, li, blockquote, div, ul, ol";

/**
 * The note's text, or the selected part of it, with a line break between blocks. Each piece
 * remembers its text node, so corrections can be applied without touching formatting.
 */
export function readNoteText(editor: HTMLElement, range: Range | null): NoteTextSnapshot {
  const segments: TextSegment[] = [];
  let text = "";
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (range && !range.intersectsNode(node)) continue;
    if (node instanceof Element) {
      const startsLine = node.matches(blockSelector) || node.tagName === "BR";
      if (startsLine && text && !text.endsWith("\n")) text += "\n";
      continue;
    }
    if (!(node instanceof Text)) continue;
    const nodeStart = range?.startContainer === node ? range.startOffset : 0;
    const nodeEnd = range?.endContainer === node ? range.endOffset : node.data.length;
    if (nodeEnd <= nodeStart) continue;
    const segmentText = node.data.slice(nodeStart, nodeEnd);
    segments.push({ node, nodeEnd, nodeStart, text: segmentText, textStart: text.length });
    text += segmentText;
  }
  return { segments, text: text.trim() === "" ? "" : text };
}

function findPosition(segments: TextSegment[], index: number, isEnd: boolean) {
  return segments.find(function containsIndex(segment) {
    const length = segment.nodeEnd - segment.nodeStart;
    return isEnd
      ? index > segment.textStart && index <= segment.textStart + length
      : index >= segment.textStart && index < segment.textStart + length;
  });
}

function insertTextAt(range: Range, text: string) {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  // execCommand is deprecated but is the only way to edit contenteditable content while
  // keeping the native undo history.
  document.execCommand("insertText", false, text);
}

/**
 * Applies proofreading corrections in place. Corrections inside one text node keep the
 * surrounding formatting; any that would span formatting boundaries are left alone.
 * Returns how many were applied.
 */
export function applyNoteCorrections(
  editor: HTMLElement,
  snapshot: NoteTextSnapshot,
  corrections: readonly ProofreadCorrection[],
) {
  editor.focus({ preventScroll: true });
  let applied = 0;
  const latestFirst = corrections.toSorted(function compareStarts(first, second) {
    return second.startIndex - first.startIndex;
  });
  for (const correction of latestFirst) {
    const start = findPosition(snapshot.segments, correction.startIndex, false);
    const end =
      correction.endIndex === correction.startIndex
        ? start
        : findPosition(snapshot.segments, correction.endIndex, true);
    if (!start || start !== end || !isUnchanged(start)) continue;
    const range = document.createRange();
    range.setStart(start.node, start.nodeStart + correction.startIndex - start.textStart);
    range.setEnd(start.node, start.nodeStart + correction.endIndex - start.textStart);
    insertTextAt(range, correction.correction);
    applied += 1;
  }
  return applied;
}

/** True while the segment's text is still exactly what was proofread. */
function isUnchanged(segment: TextSegment) {
  return (
    segment.node.isConnected &&
    segment.node.data.slice(segment.nodeStart, segment.nodeEnd) === segment.text
  );
}

/** Replaces the selection, or the whole note, with plain rewritten text. */
export function replaceNoteText(editor: HTMLElement, range: Range | null, text: string) {
  editor.focus({ preventScroll: true });
  const target = range?.cloneRange() ?? document.createRange();
  if (!range) target.selectNodeContents(editor);
  insertTextAt(target, text);
}

/**
 * Plain rewritten text would drop photos and checklists, so replacing is offered only for a
 * selection or note without them.
 */
export function canReplaceNoteText(editor: HTMLElement, range: Range | null) {
  const content = range ? range.cloneContents() : editor;
  return !content.querySelector("img, [data-type='checklist'], li[data-checked]");
}
