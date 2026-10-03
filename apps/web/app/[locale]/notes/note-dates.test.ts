import { describe, expect, it } from "vitest";

import type { Note } from "./types";

import { groupNotes, sortNotes } from "./note-dates";

const now = new Date(2026, 9, 3, 15, 0).getTime();
const dayMilliseconds = 86_400_000;
const labels = {
  pinned: "Pinned",
  previous7Days: "Previous 7 Days",
  previous30Days: "Previous 30 Days",
};

function createNote(id: string, daysAgo: number, overrides: Partial<Note> = {}): Note {
  const timestamp = now - daysAgo * dayMilliseconds;
  return {
    id,
    folderId: "notes",
    html: "",
    title: id,
    preview: "",
    thumbnail: null,
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

describe("note grouping", function () {
  it("groups notes into pinned, relative day, and month sections", function () {
    const notes = sortNotes(
      [
        createNote("today", 0),
        createNote("pinned", 40, { pinned: true }),
        createNote("yesterday", 1),
        createNote("this-week", 4),
        createNote("this-month", 20),
        createNote("summer", 70),
        createNote("last-year", 400),
      ],
      "edited",
      "en",
    );

    const sections = groupNotes(notes, {
      groupByDate: true,
      labels,
      locale: "en",
      now,
      sortOrder: "edited",
    });

    expect(
      sections.map(function describeSection(section) {
        return [section.title, section.notes.map((note) => note.id)];
      }),
    ).toEqual([
      ["Pinned", ["pinned"]],
      ["Today", ["today"]],
      ["Yesterday", ["yesterday"]],
      ["Previous 7 Days", ["this-week"]],
      ["Previous 30 Days", ["this-month"]],
      ["July", ["summer"]],
      ["2025", ["last-year"]],
    ]);
  });

  it("lists title-sorted notes in one section after pinned notes", function () {
    const notes = sortNotes(
      [createNote("Zebra", 0), createNote("apple", 3), createNote("Mango", 1, { pinned: true })],
      "title",
      "en",
    );

    const sections = groupNotes(notes, {
      groupByDate: true,
      labels,
      locale: "en",
      now,
      sortOrder: "title",
    });

    expect(
      sections.map(function describeSection(section) {
        return section.notes.map((note) => note.title);
      }),
    ).toEqual([["Mango"], ["apple", "Zebra"]]);
  });
});
