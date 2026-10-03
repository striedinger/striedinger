import type { Note, NotesSortOrder } from "./types";

import { getCollator, getDateTimeFormat, getRelativeTimeFormat } from "../../lib/intl-cache";

export interface NoteSection {
  id: string;
  notes: Note[];
  title: string;
}

interface SectionLabels {
  pinned: string;
  previous30Days: string;
  previous7Days: string;
}

const dayMilliseconds = 86_400_000;

export function sortNotes(notes: readonly Note[], sortOrder: NotesSortOrder, locale: string) {
  const collator = getCollator(locale, { numeric: true, sensitivity: "base" });
  return notes.toSorted(function compareNotes(first, second) {
    if (sortOrder === "title") return collator.compare(first.title, second.title);
    if (sortOrder === "created") return second.createdAt - first.createdAt;
    return second.updatedAt - first.updatedAt;
  });
}

function getNoteTimestamp(note: Note, sortOrder: NotesSortOrder) {
  return sortOrder === "created" ? note.createdAt : note.updatedAt;
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Groups notes into the date sections Notes uses: Pinned, Today, Yesterday, and older ranges. */
export function groupNotes(
  sortedNotes: readonly Note[],
  {
    groupByDate,
    labels,
    locale,
    now,
    sortOrder,
  }: {
    groupByDate: boolean;
    labels: SectionLabels;
    locale: string;
    now: number;
    sortOrder: NotesSortOrder;
  },
): NoteSection[] {
  const pinnedNotes = sortedNotes.filter(function isPinned(note) {
    return note.pinned;
  });
  const otherNotes = sortedNotes.filter(function isNotPinned(note) {
    return !note.pinned;
  });
  const sections: NoteSection[] = [];
  if (pinnedNotes.length > 0)
    sections.push({ id: "pinned", title: labels.pinned, notes: pinnedNotes });
  if (!groupByDate || sortOrder === "title") {
    if (otherNotes.length > 0) sections.push({ id: "notes", title: "", notes: otherNotes });
    return sections;
  }

  const relativeFormatter = getRelativeTimeFormat(locale, { numeric: "auto" });
  const monthFormatter = getDateTimeFormat(locale, { month: "long" });
  const today = startOfDay(now);
  const currentYear = new Date(now).getFullYear();
  const sectionsById = new Map<string, NoteSection>();

  for (const note of otherNotes) {
    const timestamp = getNoteTimestamp(note, sortOrder);
    const dayDifference = Math.round((today - startOfDay(timestamp)) / dayMilliseconds);
    const date = new Date(timestamp);
    let id: string;
    let title: string;
    if (dayDifference <= 0) {
      id = "today";
      title = capitalize(relativeFormatter.format(0, "day"), locale);
    } else if (dayDifference === 1) {
      id = "yesterday";
      title = capitalize(relativeFormatter.format(-1, "day"), locale);
    } else if (dayDifference <= 7) {
      id = "previous-7";
      title = labels.previous7Days;
    } else if (dayDifference <= 30) {
      id = "previous-30";
      title = labels.previous30Days;
    } else if (date.getFullYear() === currentYear) {
      id = `month-${date.getMonth()}`;
      title = capitalize(monthFormatter.format(date), locale);
    } else {
      id = `year-${date.getFullYear()}`;
      title = String(date.getFullYear());
    }
    const section = sectionsById.get(id);
    if (section) {
      section.notes.push(note);
    } else {
      const nextSection = { id, title, notes: [note] };
      sectionsById.set(id, nextSection);
      sections.push(nextSection);
    }
  }
  return sections;
}

/** Formats the date shown beside a note's preview: a time today, then a weekday, then a date. */
export function formatNoteListDate(timestamp: number, locale: string, now: number) {
  const dayDifference = Math.round((startOfDay(now) - startOfDay(timestamp)) / dayMilliseconds);
  if (dayDifference <= 0) {
    return getDateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(timestamp);
  }
  if (dayDifference === 1) {
    return capitalize(getRelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day"), locale);
  }
  if (dayDifference < 7) {
    return capitalize(getDateTimeFormat(locale, { weekday: "long" }).format(timestamp), locale);
  }
  return getDateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  }).format(timestamp);
}

export function formatNoteHeaderDate(timestamp: number, locale: string) {
  return getDateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(timestamp);
}

function capitalize(value: string, locale: string) {
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}
