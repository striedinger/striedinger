import { Text } from "@workspace/ui/components/text";

import type { Note, NotesMessages } from "./types";

import { formatNoteListDate } from "./note-dates";

interface NoteGalleryCardProps {
  locale: string;
  messages: NotesMessages;
  note: Note;
  now: number;
  onSelect: (note: Note) => void;
  selected: boolean;
}

export function NoteGalleryCard({
  locale,
  messages,
  note,
  now,
  onSelect,
  selected,
}: NoteGalleryCardProps) {
  const title = note.title || messages["New Note"];

  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-current={selected || undefined}
        className="group flex w-full flex-col items-center gap-1.5 text-center outline-none select-none"
        onClick={function selectNote() {
          onSelect(note);
        }}
      >
        <span className="relative block aspect-[0.85] w-full overflow-hidden rounded-ios-md border-[0.5px] border-ios-separator bg-ios-grouped-cell text-left shadow-ios-raised transition-transform duration-150 group-focus-visible:ring-2 group-focus-visible:ring-ios-tint group-active:scale-[0.97] group-aria-current:ring-[3px] group-aria-current:ring-ios-tint motion-reduce:transition-none">
          {note.thumbnail ? (
            // Note images are local data URLs, so next/image optimization does not apply.
            // oxlint-disable-next-line nextjs/no-img-element
            <img
              src={note.thumbnail}
              alt=""
              decoding="async"
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="flex flex-col gap-1 p-2.5">
              <Text
                as="span"
                numberOfLines={2}
                className="text-ios-caption2 font-bold text-ios-label"
              >
                {title}
              </Text>
              <Text
                as="span"
                numberOfLines={6}
                className="text-[9px] leading-[12px] text-ios-secondary-label"
              >
                {note.preview}
              </Text>
            </span>
          )}
        </span>
        <Text
          as="span"
          numberOfLines={1}
          className="w-full text-ios-footnote font-semibold text-ios-label"
        >
          {title}
        </Text>
        <Text as="span" className="-mt-1.5 text-ios-caption1 text-ios-secondary-label">
          {formatNoteListDate(note.updatedAt, locale, now)}
        </Text>
      </button>
    </li>
  );
}
