"use client";

import { FileUpIcon } from "@workspace/icons/file-up-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import type { DropLabels } from "./types";

interface FileDropZoneProps {
  labels: DropLabels;
  onFiles: (files: File[]) => void;
}

export function FileDropZone({ labels, onFiles }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) onFiles(files);
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    if (files.length > 0) onFiles(files);
    event.currentTarget.value = "";
  }

  return (
    <section className="flex min-w-0 flex-col gap-5" aria-labelledby="drop-zone-heading">
      <div
        className={cn(
          "group flex min-h-56 flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-border bg-card/70 px-6 py-8 text-center shadow-surface transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out focus-within:border-primary/60 focus-within:bg-card focus-within:shadow-raised motion-reduce:transform-none motion-reduce:transition-none sm:min-h-48 sm:flex-row sm:justify-start sm:px-8 sm:text-left",
          isDragging
            ? "scale-[1.01] border-primary bg-accent/70 shadow-raised"
            : "hover:border-primary/45 hover:bg-card",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-raised transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
          <FileUpIcon className="size-7" />
        </div>

        <div className="flex max-w-md flex-1 flex-col gap-1.5">
          <Text as="h2" id="drop-zone-heading" size="xl" weight="semibold">
            {isDragging ? labels.dropFiles : labels.dropHint}
          </Text>
          <Text id="drop-zone-description" tone="muted">
            {labels.privacy}
          </Text>
        </div>

        <Button
          render={<label htmlFor="drop-file-input" aria-label={labels.selectFiles} />}
          nativeButton={false}
          size="lg"
          className="h-11 shrink-0 px-7 sm:ml-auto"
        >
          {labels.selectFiles}
        </Button>
        <input
          id="drop-file-input"
          type="file"
          className="sr-only"
          multiple
          aria-describedby="drop-zone-description"
          onChange={handleFileSelection}
        />
      </div>
    </section>
  );
}

function handleDragOver(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}
