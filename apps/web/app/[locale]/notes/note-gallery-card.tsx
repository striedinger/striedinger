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
        <span className="border-ios-separator bg-ios-grouped-cell group-focus-visible:ring-ios-tint group-aria-current:ring-ios-tint relative block aspect-[0.85] w-full overflow-hidden rounded-[10px] border-[0.5px] text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-transform duration-150 group-focus-visible:ring-2 group-active:scale-[0.97] group-aria-current:ring-[3px] motion-reduce:transition-none">
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
                className="text-ios-caption2 text-ios-label font-bold"
              >
                {title}
              </Text>
              <Text
                as="span"
                numberOfLines={6}
                className="text-ios-secondary-label text-[9px] leading-[12px]"
              >
                {note.preview}
              </Text>
            </span>
          )}
        </span>
        <Text
          as="span"
          numberOfLines={1}
          className="text-ios-footnote text-ios-label w-full font-semibold"
        >
          {title}
        </Text>
        <Text as="span" className="text-ios-caption1 text-ios-secondary-label -mt-1.5">
          {formatNoteListDate(note.updatedAt, locale, now)}
        </Text>
      </button>
    </li>
  );
}
