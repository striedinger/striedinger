// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { applyNoteCorrections, readNoteText } from "./note-writing-text";

function createEditor(html: string) {
  const editor = document.createElement("div");
  editor.innerHTML = html;
  document.body.append(editor);
  return editor;
}

describe("readNoteText", function () {
  it("puts each block on its own line", function () {
    const editor = createEditor("<h1>Trip</h1><p>Pack <b>socks</b></p><ul><li>Tickets</li></ul>");
    expect(readNoteText(editor, null).text).toBe("Trip\nPack socks\nTickets");
  });

  it("reads only the selected text", function () {
    const editor = createEditor("<p>Hello brave world</p>");
    const text = editor.querySelector("p")!.firstChild!;
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
        const range = window.getSelection()!.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(value));
        return true;
      },
    );
    document.execCommand = execCommand;
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
