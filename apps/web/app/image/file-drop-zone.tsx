"use client";

import type { DragEvent } from "react";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useRef, useState } from "react";

import type { ImageOptimizerLabels } from "./types";

function handleDragOver(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
}

interface FileDropZoneProps {
  labels: ImageOptimizerLabels;
  onFiles: (files: File[]) => void;
}

export function FileDropZone({ labels, onFiles }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      onDragEnter={function handleDragEnter(event) {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={function handleDragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "flex min-h-64 flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-border bg-surface-inset px-6 py-12 text-center transition-[border-color,background-color,transform] duration-150 motion-reduce:transform-none motion-reduce:transition-none",
        isDragging && "scale-[1.01] border-primary bg-accent/60",
      )}
    >
      <div
        className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-3xl text-primary shadow-sm"
        aria-hidden="true"
      >
        ↓
      </div>
      <div className="flex flex-col gap-1.5">
        <Text size="lg" weight="semibold">
          {isDragging ? labels.dropActive : labels.dropPrompt}
        </Text>
        <Text size="sm" tone="muted">
          {labels.supported}
        </Text>
      </div>
      <Button
        type="button"
        onClick={function openFilePicker() {
          inputRef.current?.click();
        }}
      >
        {labels.chooseFiles}
      </Button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={function selectFiles(event) {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
