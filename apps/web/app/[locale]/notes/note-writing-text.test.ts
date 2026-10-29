// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { applyNoteCorrections, canReplaceNoteText, readNoteText } from "./note-writing-text";

function createEditor(html: string) {
  const editor = document.createElement("div");
  editor.innerHTML = html;
  document.body.append(editor);
  return editor;
}

function requireValue<Value>(value: Value | null | undefined, description: string): Value {
  if (value === null || value === undefined) throw new Error(`Expected ${description}`);
  return value;
}

/** jsdom has no editing commands, so tests supply the one the corrections use. */
function stubExecCommand(execCommand: (command: string, ui: boolean, value: string) => boolean) {
  Object.assign(document, { execCommand });
}

describe("readNoteText", function () {
  it("puts each block on its own line", function () {
    const editor = createEditor("<h1>Trip</h1><p>Pack <b>socks</b></p><ul><li>Tickets</li></ul>");
    expect(readNoteText(editor, null).text).toBe("Trip\nPack socks\nTickets");
  });

  it("reads only the selected text", function () {
    const editor = createEditor("<p>Hello brave world</p>");
    const paragraph = requireValue(editor.querySelector("p"), "a paragraph");
    const text = requireValue(paragraph.firstChild, "paragraph text");
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 11);
    expect(readNoteText(editor, range).text).toBe("brave");
  });
});

describe("applyNoteCorrections", function () {
  it("fixes words inside formatted text and skips corrections across formatting", function () {
    const editor = createEditor("<p>Teh <b>quik</b> fox</p>");
    const execCommand = vi.fn<(command: string, ui: boolean, value: string) => boolean>(
      function insertText(_command, _ui, value) {
        const range = requireValue(window.getSelection(), "a selection").getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(value));
        return true;
      },
    );
    stubExecCommand(execCommand);
    const snapshot = readNoteText(editor, null);

    const applied = applyNoteCorrections(editor, snapshot, [
      { startIndex: 0, endIndex: 3, correction: "The" },
      { startIndex: 4, endIndex: 8, correction: "quick" },
      { startIndex: 2, endIndex: 6, correction: "e qu" },
    ]);

    expect(applied).toBe(2);
    expect(editor.textContent).toBe("The quick fox");
    expect(editor.querySelector("b")?.textContent).toBe("quick");
  });
});

describe("applyNoteCorrections after edits", function () {
  it("skips corrections in text that changed after proofreading", function () {
    const editor = createEditor("<p>Teh fox</p>");
    stubExecCommand(vi.fn<() => boolean>().mockReturnValue(true));
    const snapshot = readNoteText(editor, null);
    const paragraph = requireValue(editor.querySelector("p"), "a paragraph");
    requireValue(paragraph.firstChild, "paragraph text").textContent = "A Teh fox";

    expect(
      applyNoteCorrections(editor, snapshot, [{ startIndex: 0, endIndex: 3, correction: "The" }]),
    ).toBe(0);
    expect(editor.textContent).toBe("A Teh fox");
  });
});

describe("canReplaceNoteText", function () {
  it("protects photos and checklists inside the text being replaced", function () {
    const editor = createEditor('<p>Hello</p><p><img src="data:image/png;base64,AA=="></p>');
    const textOnly = document.createRange();
    textOnly.selectNodeContents(requireValue(editor.querySelector("p"), "a paragraph"));
    const withPhoto = document.createRange();
    withPhoto.selectNodeContents(editor);

    expect(canReplaceNoteText(editor, textOnly)).toBe(true);
    expect(canReplaceNoteText(editor, withPhoto)).toBe(false);
    expect(canReplaceNoteText(editor, null)).toBe(false);
  });
});
