// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { noteHtmlToPlainText, sanitizeNoteHtml, summarizeNoteHtml } from "./note-html";

describe("note HTML", function () {
  it("removes scripts, event handlers, and unsafe links while keeping supported formatting", function () {
    const sanitizedHtml = sanitizeNoteHtml(
      '<h1 onclick="alert(1)">Trip</h1><script>alert(1)</script><p style="color:red">Pack <strong>light</strong> <a href="javascript:alert(1)">now</a> <a href="https://example.com">map</a></p><img src="https://tracker.example/pixel.gif">',
    );

    expect(sanitizedHtml).toBe(
      '<h1>Trip</h1><p>Pack <b>light</b> <span>now</span> <a href="https://example.com" rel="noopener noreferrer" target="_blank">map</a></p>',
    );
  });

  it("keeps checklist state and embedded photos", function () {
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const sanitizedHtml = sanitizeNoteHtml(
      `<ul data-type="checklist"><li data-checked="true" class="x">Milk</li><li>Eggs</li></ul><img src="${image}" alt="Receipt">`,
    );

    expect(sanitizedHtml).toBe(
      `<ul data-type="checklist"><li data-checked="true">Milk</li><li data-checked="false">Eggs</li></ul><img src="${image}" alt="Receipt">`,
    );
  });

  it("uses the first line as the title and the following lines as the preview", function () {
    const summary = summarizeNoteHtml(
      '<h1>Groceries</h1><p>For the weekend</p><ul data-type="checklist"><li data-checked="false">Apples</li></ul>',
    );

    expect(summary).toEqual({
      title: "Groceries",
      preview: "For the weekend Apples",
      thumbnail: null,
    });
  });

  it("shares checklists and numbered lists as readable plain text", function () {
    expect(
      noteHtmlToPlainText(
        '<h1>Plan</h1><ol><li>Book flights</li><li>Pack</li></ol><ul data-type="checklist"><li data-checked="true">Passport</li></ul>',
      ),
    ).toBe("Plan\n1. Book flights\n2. Pack\n☑ Passport");
  });
});
